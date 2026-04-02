const adjectives = ['Brave', 'Clever', 'Swift', 'Silent', 'Mighty', 'Cunning', 'Fierce', 'Lucky', 'Wild', 'Shadow'];
const animals = ['Fox', 'Bear', 'Wolf', 'Hawk', 'Tiger', 'Lion', 'Eagle', 'Snake', 'Panther', 'Shark'];

export function generateRandomName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj}_${animal}`;
}

export function getPlayerName(): string {
  let name = localStorage.getItem('playerName');
  if (!name) {
    name = generateRandomName();
    localStorage.setItem('playerName', name);
  }
  return name;
}

export function setPlayerName(name: string) {
  if (name.trim()) {
    localStorage.setItem('playerName', name.trim());
  }
}
