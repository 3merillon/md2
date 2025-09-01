export class CharacterLoader {
  constructor() {
    this.availableCharacters = [];
    this.currentCharacterData = null;
    this.initializeCharacters();
  }

  // Define all available characters and their assets here
  initializeCharacters() {
    this.availableCharacters = [
      {
        name: 'ratamahatta',
        mainModel: 'ratamahatta/ratamahatta.md2',
        weapons: [
          { name: 'weapon', model: 'ratamahatta/weapon.md2', texture: 'ratamahatta/skins/weapon.png' },
          { name: 'w_bfg', model: 'ratamahatta/w_bfg.md2', texture: 'ratamahatta/skins/w_bfg.png' },
          { name: 'w_blaster', model: 'ratamahatta/w_blaster.md2', texture: 'ratamahatta/skins/w_blaster.png' },
          { name: 'w_chaingun', model: 'ratamahatta/w_chaingun.md2', texture: 'ratamahatta/skins/w_chaingun.png' },
          { name: 'w_glauncher', model: 'ratamahatta/w_glauncher.md2', texture: 'ratamahatta/skins/w_glauncher.png' },
          { name: 'w_hyperblaster', model: 'ratamahatta/w_hyperblaster.md2', texture: 'ratamahatta/skins/w_hyperblaster.png' },
          { name: 'w_machinegun', model: 'ratamahatta/w_machinegun.md2', texture: 'ratamahatta/skins/w_machinegun.png' },
          { name: 'w_railgun', model: 'ratamahatta/w_railgun.md2', texture: 'ratamahatta/skins/w_railgun.png' },
          { name: 'w_rlauncher', model: 'ratamahatta/w_rlauncher.md2', texture: 'ratamahatta/skins/w_rlauncher.png' },
          { name: 'w_shotgun', model: 'ratamahatta/w_shotgun.md2', texture: 'ratamahatta/skins/w_shotgun.png' },
          { name: 'w_sshotgun', model: 'ratamahatta/w_sshotgun.md2', texture: 'ratamahatta/skins/w_sshotgun.png' }
        ],
        skins: [
          { name: 'ratamahatta', texture: 'ratamahatta/skins/ratamahatta.png' },
          { name: 'ctf_b', texture: 'ratamahatta/skins/ctf_b.png' },
          { name: 'ctf_r', texture: 'ratamahatta/skins/ctf_r.png' },
          { name: 'dead', texture: 'ratamahatta/skins/dead.png' },
          { name: 'gearwhore', texture: 'ratamahatta/skins/gearwhore.png' }
        ]
      },
      {
        name: 'gunner',
        mainModel: 'gunner/gunner.md2',
        weapons: [
          { name: 'weapon', model: 'gunner/weapon.md2', texture: 'gunner/skins/weapon.png' }
        ],
        skins: [
          { name: 'gunner', texture: 'gunner/skins/gunner.png' }
        ]
      }
    ];
  }

  // Simple methods to manage characters
  getAvailableCharacters() {
    return this.availableCharacters;
  }

  getCharacterData(charName) {
    return this.availableCharacters.find(char => char.name === charName);
  }

  setCurrentCharacter(charName) {
    this.currentCharacterData = this.getCharacterData(charName);
    return this.currentCharacterData;
  }

  getCurrentCharacter() {
    return this.currentCharacterData;
  }

  // Helper method to add a new character (for easy expansion)
  addCharacter(characterData) {
    const existingIndex = this.availableCharacters.findIndex(char => char.name === characterData.name);
    if (existingIndex >= 0) {
      this.availableCharacters[existingIndex] = characterData;
    } else {
      this.availableCharacters.push(characterData);
    }
  }

  // Helper method to remove a character
  removeCharacter(charName) {
    this.availableCharacters = this.availableCharacters.filter(char => char.name !== charName);
  }
}