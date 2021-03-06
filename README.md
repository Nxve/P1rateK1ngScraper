## Usage Example

- bash:
```
OVERWRITE=true VERBOSE=1 node index.js
```

#### Environment Variables
- OVERWRITE *: Boolean*
    - default: **false**
- PATH_DUMP *: String*
    - default: **%workingDir%/Dump**
- VERBOSE *: Number (0-2)*
    - default: **2**


## Info Dump

- [ ] Monster
    - [x] Images
    - [x] Attributes
    - [x] Skills
    - [x] Drops
    - [x] Required in Mission
    - [ ] Spawn Points
- [ ] Item
    - [x] Icon
    - [ ] Properties
    - [x] Attributes
    - [x] Found In NPC
    - [x] Drop From
    - [x] Required In Mission
    - [x] Rewarded In Mission
    - [ ] Blueprints
    - [x] Obtained From
- [x] Skill
    - [x] Icon
    - [x] Description
- [ ] NPC
    - [ ] Images
    - [ ] Type
    - [ ] Name
    - [ ] Spawn Point
    - [ ] Sell goods
    - [ ] Participate In Mission
- [ ] Map
    - [ ] Name
    - [ ] Monsters
    - [ ] NPCs
- [ ] Mission/Quest
    - [ ] ...
- [ ] Portal
    - [ ] ...
- [ ] Class
    - [ ] ...

## TODO

- [ ] Read config from .env or config.js
- [ ] Concurrency
