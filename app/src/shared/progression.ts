export const MAX_CHARACTER_LEVEL = 100;

export function getRequiredExperienceForLevel(nextLevel: number) {
  if (nextLevel < 2 || nextLevel > MAX_CHARACTER_LEVEL) {
    return null;
  }

  return Math.ceil((Math.pow(nextLevel, 1.5) * 50) / 100) * 100;
}

export function formatCharacterLevel(level: number) {
  return `Lv. ${level}`;
}

export function formatCharacterExperience(level: number, experience: number) {
  const nextLevel = level + 1;
  const requiredExperience = getRequiredExperienceForLevel(nextLevel);

  if (!requiredExperience) {
    return `${experience.toLocaleString()} EXP`;
  }

  return `${experience.toLocaleString()} / ${requiredExperience.toLocaleString()} EXP`;
}
