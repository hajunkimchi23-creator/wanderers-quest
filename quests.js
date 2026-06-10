class Quest {
  constructor(id, title, description, giver, objectives, rewards) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.giver = giver;
    this.objectives = objectives;
    this.rewards = rewards;
    this.isCompleted = false;
    this.progress = 0;
  }

  updateProgress(index) {
    if (this.objectives[index]) {
      this.objectives[index].completed = true;
      this.calculateProgress();
    }
  }

  calculateProgress() {
    const completed = this.objectives.filter(obj => obj.completed).length;
    this.progress = (completed / this.objectives.length) * 100;
    if (this.progress >= 100) this.isCompleted = true;
  }

  getStatus() {
    const completed = this.objectives.filter(obj => obj.completed).length;
    return `${completed}/${this.objectives.length}`;
  }
}

class DialogueNode {
  constructor(id, speaker, text, choices = []) {
    this.id = id;
    this.speaker = speaker;
    this.text = text;
    this.choices = choices;
  }
}

class DialogueTree {
  constructor(rootNodeId) {
    this.nodes = {};
    this.currentNodeId = rootNodeId;
    this.rootNodeId = rootNodeId;
    this.isActive = false;
  }

  addNode(node) {
    this.nodes[node.id] = node;
  }

  start() {
    this.currentNodeId = this.rootNodeId;
    this.isActive = true;
    return this.getCurrentNode();
  }

  getCurrentNode() {
    return this.nodes[this.currentNodeId];
  }

  selectChoice(index) {
    const node = this.getCurrentNode();
    if (node && node.choices[index]) {
      this.currentNodeId = node.choices[index].nextNodeId;
      const nextNode = this.getCurrentNode();
      if (!nextNode) this.isActive = false;
      return nextNode;
    }
    return null;
  }

  end() {
    this.isActive = false;
    this.currentNodeId = this.rootNodeId;
  }
}

const QUESTS = {
  'first_steps': new Quest(
    'first_steps',
    'First Steps',
    'Talk to the Elder and explore.',
    'Elder',
    [
      { description: 'Speak to Elder', completed: false },
      { description: 'Explore the village', completed: false }
    ],
    { gold: 100, experience: 50 }
  ),
  'monster_hunt': new Quest(
    'monster_hunt',
    'Defeat the Creatures',
    'Defeat 5 creatures plaguing the village.',
    'Guard',
    [
      { description: 'Defeat creatures: 0/5', completed: false }
    ],
    { gold: 300, experience: 150 }
  )
};

const NPC_DIALOGUES = {
  'elder': [
    'Welcome, wanderer.',
    'The darkness grows stronger.',
    'Be careful out there.'
  ],
  'merchant': [
    'Welcome to my shop!',
    'I have rare items.',
    'Come again soon!'
  ],
  'guard': [
    'Watch yourself out there.',
    'The roads are dangerous.',
    'Stay alert, wanderer.'
  ]
};

function createElderDialogue() {
  const tree = new DialogueTree('elder_intro');
  tree.addNode(new DialogueNode(
    'elder_intro',
    'Elder',
    'Welcome, young wanderer. The darkness grows stronger each day.',
    [
      { text: 'How can I help?', nextNodeId: 'elder_quest' },
      { text: 'Goodbye.', nextNodeId: null }
    ]
  ));
  tree.addNode(new DialogueNode(
    'elder_quest',
    'Elder',
    'Journey into the Forest and find the Crystal of Light.',
    []
  ));
  return tree;
}

const DIALOGUES = {
  'elder': createElderDialogue()
};

class DialogueManager {
  constructor() {
    this.currentDialogue = null;
    this.isPlaying = false;
  }

  startDialogue(tree) {
    this.currentDialogue = tree;
    this.isPlaying = true;
    return this.getCurrentNode();
  }

  getCurrentNode() {
    return this.currentDialogue ? this.currentDialogue.getCurrentNode() : null;
  }

  selectChoice(index) {
    if (this.currentDialogue) {
      const nextNode = this.currentDialogue.selectChoice(index);
      if (!nextNode) this.endDialogue();
      return nextNode;
    }
    return null;
  }

  endDialogue() {
    if (this.currentDialogue) this.currentDialogue.end();
    this.currentDialogue = null;
    this.isPlaying = false;
  }

  display(node) {
    if (!node) return;
    document.getElementById('dialogueSpeaker').textContent = node.speaker;
    document.getElementById('dialogueText').textContent = node.text;
    const choicesContainer = document.getElementById('dialogueChoices');
    choicesContainer.innerHTML = '';
    if (node.choices.length > 0) {
      node.choices.forEach((choice, i) => {
        const btn = document.createElement('div');
        btn.className = 'dialogue-choice';
        btn.textContent = choice.text;
        btn.onclick = () => {
          const nextNode = this.selectChoice(i);
          if (nextNode) {
            this.display(nextNode);
          } else {
            document.getElementById('dialogueBox').classList.add('hidden');
          }
        };
        choicesContainer.appendChild(btn);
      });
    }
    document.getElementById('dialogueBox').classList.remove('hidden');
  }
}
