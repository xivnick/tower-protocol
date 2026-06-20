export type Character = {
  id: string;
  user_id: string;
  name: string;
  level: number;
  experience: number;
  strength: number;
  agility: number;
  dexterity: number;
  vitality: number;
  endurance: number;
  intelligence: number;
  wisdom: number;
  stat_points: number;
  bonus_stat_points: number;
  hunt_available_at: string | null;
  created_at: string;
  updated_at: string;
};
