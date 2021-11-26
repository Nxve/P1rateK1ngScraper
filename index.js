const Fs = require('fs'),
      Path = require('path'),
      Axios = require('axios'),
      Cheerio = require('cheerio'),
      { stdout } = require('process');

const OVERWRITE = process.env.OVERWRITE ? (process.env.OVERWRITE.toLowerCase() === 'true') : false,
      PATH_DUMP = process.env.PATH_DUMP ?? Path.resolve(__dirname, 'Dump'),
      VERBOSE = process.env.VERBOSE ?? 2; // 0: Minimal / 1: Reduced / 2: Full

var SKILLS_FETCH_QUEUE = {},
    ERROR_COUNT = 0;

// File Check

function isMissingFiles(arrayFilePath){
  for (let i = 0; i < arrayFilePath.length; i++){
    if (!Fs.existsSync(arrayFilePath[i])){
      return true;
    }
  }
  return false
}

function hasDumpedMonster(id){
  return !isMissingFiles([
    Path.resolve(PATH_DUMP, 'image', 'monster', `${id}.png`),
    Path.resolve(PATH_DUMP, 'image', 'monster', `${id}b.png`),
    Path.resolve(PATH_DUMP, 'info', 'monster', `${id}.json`)
  ]);
}

function hasDumpedSkill(id){
  return !isMissingFiles([
    Path.resolve(PATH_DUMP, 'image', 'skill', `${id}.png`),
    Path.resolve(PATH_DUMP, 'info', 'skill', `${id}.json`)
  ]);
}

function hasDumpedItem(id){
  return !isMissingFiles([
    Path.resolve(PATH_DUMP, 'image', 'item', `${id}.png`),
    Path.resolve(PATH_DUMP, 'info', 'item', `${id}.json`)
  ]);
}

// File Write

async function downloadImage(url, folderName, fileName){  
  const path = Path.resolve(PATH_DUMP, 'image', folderName, `${fileName}.png`);
  if (!OVERWRITE && Fs.existsSync(path)) return;

  const writer = Fs.createWriteStream(path),
        response = await Axios({url,responseType: 'stream'});

  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  })
}

async function saveJSON(obj, folderName, fileName){
  const path = Path.resolve(PATH_DUMP, 'info', folderName, `${fileName}.json`);
  if (!OVERWRITE && Fs.existsSync(path)) return;

  return new Promise((resolve,reject)=>{
    Fs.writeFile(path, JSON.stringify(obj, null, 2), null, (err)=>{err ? reject(err) : resolve()});
  })
}

async function dumpMonster(id){
  return new Promise(async (resolve)=>{
    if (VERBOSE == 2) stdout.write(`Monster[${id}].. `);

    if (!OVERWRITE && hasDumpedMonster(id)){
      if (VERBOSE == 2) stdout.write("Already dumped.\n");
      resolve();
    } else {
      const monsterInfo = await getMonsterInfo(id);
      if (monsterInfo){
        if (VERBOSE == 2) stdout.write(`Downloading info.. `);
        try {
          await saveJSON(monsterInfo, 'monster', id)
          await downloadImage(`https://pirateking.online/data/database/monster/icon/${id}.png`, 'monster', id);
          await downloadImage(`https://pirateking.online/data/database/monster/${id}.png`, 'monster', id+'b');
          if (VERBOSE == 2) stdout.write("OK.\n");
          resolve();
        } catch (err) {
          if (VERBOSE == 2) stdout.write(`ERROR.\n${err.message}\n`);
          ERROR_COUNT++;
          resolve();
        }
      } else {
        if (VERBOSE == 2) stdout.write("Not found.\n");
        resolve();
      }
    }
  })
}

async function dumpSkill(id){
  return new Promise(async (resolve)=>{
    const {name,description,iconURL} = SKILLS_FETCH_QUEUE[id];
    if (VERBOSE == 2) stdout.write(`Skill[${id}].. `);
    try {
      await saveJSON({name,description}, 'skill', id);
      await downloadImage(iconURL, 'skill', id);
      if (VERBOSE == 2) stdout.write("OK.\n");
      resolve();
    } catch (err) {
      if (VERBOSE == 2) stdout.write(`ERROR.\n${err.message}\n`);
      ERROR_COUNT++;
      resolve();
    }
  })
}

async function dumpItem(id){
  return new Promise(async (resolve)=>{
    if (VERBOSE == 2) stdout.write(`Item[${id}].. `);

    if (!OVERWRITE && hasDumpedItem(id)){
      if (VERBOSE == 2) stdout.write("Already dumped.\n");
      resolve();
    } else {
      const [itemInfo, iconURL] = await getItemInfo(id);
      if (itemInfo){
        if (VERBOSE == 2) stdout.write(`Downloading info.. `);
        try {
          await saveJSON(itemInfo, 'item', id)
          await downloadImage(iconURL, 'item', id);
          if (VERBOSE == 2) stdout.write("OK.\n");
          resolve();
        } catch (err) {
          if (VERBOSE == 2) stdout.write(`ERROR.\n${err.message}\n`);
          ERROR_COUNT++;
          resolve();
        }
      } else {
        if (VERBOSE == 2) stdout.write("Not found.\n");
        resolve();
      }
    }
  })
}

//

async function getMonsterPages(){
  return new Promise(resolve=>{
    Axios({url:`https://pirateking.online/database/monster/?count=50`})
    .then(response=>{
      if (response.status === 200){
        const $ = Cheerio.load(response.data);
        resolve($('.pageNav-page').last().text().trim());
      }
      ERROR_COUNT++;
      resolve();
    })
    .catch(()=>{
      ERROR_COUNT++;
      resolve();
    })
  })
}

async function getItemPages(){
  return new Promise(resolve=>{
    Axios({url:`https://pirateking.online/database/item/?count=50`})
    .then(response=>{
      if (response.status === 200){
        const $ = Cheerio.load(response.data);
        resolve($('.pageNav-page').last().text().trim());
      }
      ERROR_COUNT++;
      resolve();
    })
    .catch(()=>{
      ERROR_COUNT++;
      resolve();
    })
  })
}

async function getMonsterIds(pageIndex){
  return new Promise(resolve=>{
    Axios({url:`https://pirateking.online/database/monster/page-${pageIndex}?count=50`})
    .then(response=>{
      if (response.status === 200){
        const $ = Cheerio.load(response.data);
        const monsterIds = [];
        $('.database-id').each((_,elMonsterId)=>{
          monsterIds.push($(elMonsterId).text().trim().split(' ')[1]);
        })
        resolve(monsterIds);
      }
      ERROR_COUNT++;
      resolve();
    })
    .catch(()=>{
      ERROR_COUNT++;
      resolve();
    })
  })
}

async function getItemIds(pageIndex){
  return new Promise(resolve=>{
    Axios({url:`https://pirateking.online/database/item/page-${pageIndex}?count=50`})
    .then(response=>{
      if (response.status === 200){
        const $ = Cheerio.load(response.data);
        const itemIds = [];
        $('.database-id').each((_,elItemId)=>{
          itemIds.push($(elItemId).text().trim().split(' ')[1]);
        })
        resolve(itemIds);
      }
      ERROR_COUNT++;
      resolve();
    })
    .catch(()=>{
      ERROR_COUNT++;
      resolve();
    })
  })
}

async function getMonsterInfo(id){
  let info = Axios({url:`https://pirateking.online/database/monster/${id}`})
  .then(response=>{
    if (response.status === 200){
      const $ = Cheerio.load(response.data);
      if ($('.blocks').length){
        const monsterInfo = {
          name: $('.databaseMonsterContainer-name').text().trim(),
          skills: [],
          drops: [],
          missions: []
        }
        // Attributes
        $('.databaseMonsterOverviewBlock').each((_,elMonsterAttribute)=>{
          const [attributeName, attributeValue] = $(elMonsterAttribute).text().trim().split(':');
          monsterInfo[attributeName.replace(/\s/g,'')] = attributeValue.trim();
        })
        // Information Blocks
        $('.block-filterBar').each((_,elMonsterInfoBlock)=>{
          let blockName = $(elMonsterInfoBlock).find('li').text().trim().split(' ');
          blockName = blockName[blockName.length-1];
          const block = $(elMonsterInfoBlock).next();
          switch (blockName) {
            case 'Skills':
              block.find('li.structItem-minor').each((iSkill,elSkillId)=>{
                const skillId = $(elSkillId).text().trim().split(' ')[1];
                monsterInfo.skills[iSkill] = {id:skillId};
                if (!hasDumpedSkill(skillId) && !SKILLS_FETCH_QUEUE[skillId]){
                  if (VERBOSE == 2) stdout.write(`+Skill[${skillId}] `);
                  let skillInfo = {id:skillId,name:'',description:'',iconURL:''};
                  block.find('div.structItem-title').each((i,elSkillName)=>{
                    if (i === iSkill){
                      skillInfo.name = $(elSkillName).text().trim();
                      skillInfo.description = $(elSkillName).next().find('ul.structItem-parts').text().trim();
                    }
                  })
                  block.find('img.item-icon').each((i,elSkillIcon)=>{
                    if (i === iSkill){
                      skillInfo.iconURL = "https://pirateking.online"+$(elSkillIcon).attr('src');
                    }
                  })
                  SKILLS_FETCH_QUEUE[skillId] = skillInfo;
                }
              })
              block.find('ul.structItem-extraInfo').each((i,elSkillRate)=>{
                monsterInfo.skills[i].rate = $(elSkillRate).text().trim().replace('%','')
              })
              break;
            case 'next': // Drops
              block.find('li.structItem-minor').each((i,elDropId)=>{
                monsterInfo.drops[i] = {id:$(elDropId).find('span').text().trim().split(' ')[1]};
              })
              block.find('ul.structItem-extraInfo').each((i,elDropRate)=>{
                monsterInfo.drops[i].rate = $(elDropRate).text().trim().replace('%','');
              })
              break;
            case 'missions':
              block.find('li.structItem-minor').each((i,elMissionId)=>{
                monsterInfo.missions[i] = {id:$(elMissionId).text().trim().split(' ')[1]};
              })
              break;
            case 'maps':
              break;
          }
        })
        return monsterInfo
      }
    }
  })
  .catch((err)=>{
    if (VERBOSE == 2) stdout.write(`ERROR.\n${err}\n`);
  })
  return info;
}

async function getItemInfo(id){
  let iconURL, info = Axios({url:`https://pirateking.online/database/item/${id}`})
  .then(response=>{
    if (response.status === 200){
      const $ = Cheerio.load(response.data);
      if ($('.blocks').length){
        iconURL = "https://pirateking.online"+$('img.item-icon').attr('src');
        const itemInfo = {
          name: $('.databaseItemContainer-icon-name').text().trim(),
          type: null,
          lvl: null,
          maxStack: null,
          goldValue: null,
          canDrop: null,
          canPickup: null,
          foundInNPC: [],
          dropFrom: [],
          requiredIn: [],
          rewardedIn: [],
          obtainedIn: []
        }
        // Item Type & Level
        let itemTypeAndLevel = $('.databaseItemContainer-icon-itemType').text().trim();
        if (itemTypeAndLevel){
          if (itemTypeAndLevel.includes(',')){
            itemInfo.type = itemTypeAndLevel.split(',')[0];
          } else if (!itemTypeAndLevel.includes('Lv ')){
            itemInfo.type = itemTypeAndLevel;
          }
          if (itemTypeAndLevel.includes('Lv ')){
            itemInfo.lvl = itemTypeAndLevel.replace(/.*Lv /, '');
          }
        }
        // Attributes
        $('.databaseItemOverviewBlock').each((_,elItemAttribute)=>{
          const [attributeName, attributeValue] = $(elItemAttribute).text().trim().split(':');
          itemInfo[attributeName.replace(/\s/g,'')] = attributeValue.trim().replace(/\+/g,'').split(' ... ');
        })
        // Properties
        $('.databaseItem-banner').each((i,elItemProperty)=>{
          let innerText = $(elItemProperty).text().trim();
          if (innerText.endsWith("G Value")){
            itemInfo.goldValue = innerText.replace(/\D/g, '');
          } else if (innerText.endsWith("per Stack")){
            itemInfo.maxStack = innerText.replace(/\D/g, '');
          } else if (innerText.startsWith("Can")){
            if (innerText.endsWith("Drop")) itemInfo.canDrop = true;
            if (innerText.endsWith("Pick Up")) itemInfo.canPickup = true;
          } else if (innerText.startsWith("Can't")){
            if (innerText.endsWith("Drop")) itemInfo.canDrop = false;
            if (innerText.endsWith("Pick Up")) itemInfo.canPickup = false;
          } else if (innerText.startsWith("Require Race")){
          } else if (innerText.startsWith("Require Class")){
          } else {
            switch (innerText){
              case 'Invaluable':
                itemInfo.goldValue = '-1';
                break;
              default:
                stdout.write(`Uncaught property: ${innerText}! `)
                break;
            }
          }
        })
        // Information Blocks
        $('.block-filterBar').each((_,elItemInfoBlock)=>{
          let blockName = $(elItemInfoBlock).find('li').text().trim().split(' ')[0];
          const block = $(elItemInfoBlock).next();
          switch (blockName) {
            case 'Found':
              block.find('li.structItem-minor').each((i,elNPCId)=>{
                let formattedId = $(elNPCId).text().trim().split(' ');
                formattedId = formattedId[1].replace(/[^a-z]/g, '')+'.'+formattedId[3];
                itemInfo.foundInNPC[i] = {id:formattedId};
              })
              break;
            case 'Drop':
              block.find('.database-id').each((i,elMonsterId)=>{
                itemInfo.dropFrom[i] = {id:$(elMonsterId).text().trim().split(' ')[1]};
              })
              block.find('ul.structItem-extraInfo').each((i,elDropRate)=>{
                itemInfo.dropFrom[i].rate = $(elDropRate).text().trim().replace('%','');
              })
              break;
            case 'Require':
              block.find('li.structItem-minor').each((i,elMissionId)=>{
                itemInfo.requiredIn[i] = {id:$(elMissionId).text().trim().split(' ')[1]};
              })
              break;
            case 'Reward':
              block.find('li.structItem-minor').each((i,elMissionId)=>{
                itemInfo.rewardedIn[i] = {id:$(elMissionId).text().trim().split(' ')[1]};
              })
              break;
            case 'Obtained':
              block.find('.database-id').each((i,elOtherItemId)=>{
                itemInfo.obtainedIn[i] = {id:$(elOtherItemId).text().trim().split(' ')[1]};
              })
              block.find('ul.structItem-extraInfo').each((i,elObtainRate)=>{
                itemInfo.obtainedIn[i].rate = $(elObtainRate).text().trim().split(' ')[0].replace(/\D/g, '');
              })
              break;
          }
        })
        return [itemInfo, iconURL];
      }
    }
  })
  .catch((err)=>{
    if (VERBOSE == 2) stdout.write(`ERROR.\n${err}\n`);
  })
  return info
}

(async ()=>{
  console.time('DumpTime');
  console.log("PirateKingScraper:");

  try {
    Fs.mkdirSync(`${PATH_DUMP}/image/monster`, {recursive:true});
    Fs.mkdirSync(`${PATH_DUMP}/image/skill`, {recursive:true});
    Fs.mkdirSync(`${PATH_DUMP}/image/item`, {recursive:true});
    Fs.mkdirSync(`${PATH_DUMP}/info/monster`, {recursive:true});
    Fs.mkdirSync(`${PATH_DUMP}/info/skill`, {recursive:true});
    Fs.mkdirSync(`${PATH_DUMP}/info/item`, {recursive:true});
  } catch (err) {
    stdout.write(`\nAborted due to: ${err}.\n`);
    console.timeEnd('DumpTime');
    return  
  }

  let monsterIds = [],
      itemIds = [],
      monsterPages = await getMonsterPages(),
      itemPages = await getItemPages();

  if (VERBOSE >= 1) console.log(monsterPages ? `Found ${monsterPages} monster pages.` : "Couldn't find monster pages.");
  if (VERBOSE >= 1) console.log(itemPages ? `Found ${itemPages} item pages.` : "Couldn't find item pages.");

  if (monsterPages){
    if (VERBOSE >= 1) stdout.write("Fetching monsters ids.. ");

    for (let i=1; i<=monsterPages; i++) {
      monsterIds = [...monsterIds, ...(await getMonsterIds(i))];
    }
    
    if (monsterIds.length){
      if (VERBOSE >= 1) stdout.write(`OK. Monster IDs: ${monsterIds[0]} ~ ${monsterIds[monsterIds.length-1]}\n`);

      if (VERBOSE == 1) stdout.write("Fetching monsters.. ");

      for (let i = 0; i < monsterIds.length; i++) {
        await dumpMonster(monsterIds[i]);
      }

      if (VERBOSE == 1) stdout.write("DONE.\n");
      if (VERBOSE == 1 && Object.keys(SKILLS_FETCH_QUEUE).length) stdout.write("Fetching skills.. ");

      for (const skillId in SKILLS_FETCH_QUEUE) {
        await dumpSkill(skillId);
      }

      if (VERBOSE == 1) stdout.write("DONE.\n");
    } else {
      if (VERBOSE >= 1) stdout.write("ERROR.\n");
    }
  } else {
    console.log("Skipping monsters because it couldn't be found.");
  }

  if (itemPages){
    if (VERBOSE >= 1) stdout.write("Fetching items ids.. ");

    for (let i=1; i<=itemPages; i++) {
      itemIds = [...itemIds, ...(await getItemIds(i))];
    }

    if (itemIds.length){
      if (VERBOSE >= 1) stdout.write(`OK. Item IDs: ${itemIds[0]} ~ ${itemIds[itemIds.length-1]}\n`);

      if (VERBOSE == 1) stdout.write("Fetching items.. ");

      for (let i = 0; i < itemIds.length; i++) {
        await dumpItem(itemIds[i]);
      }

      if (VERBOSE == 1) stdout.write("DONE.\n");
    } else {
      if (VERBOSE >= 1) stdout.write("ERROR.\n");
    }
  } else {
    console.log("Skipping items because it couldn't be found.");
  }
  
  stdout.write(`\nFinished with ${ERROR_COUNT} errors.\n`);
  console.timeEnd('DumpTime');
})()