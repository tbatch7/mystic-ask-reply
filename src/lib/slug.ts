const ADJECTIVES = [
  "velvet","midnight","scarlet","silken","reckless","whispered","crimson","secret","sultry","amber",
  "ember","wicked","dusky","gilded","stolen","hidden","molten","feral","tender","smoky",
  "rosy","feline","drowsy","quiet","burning","silver","fevered","golden","dim","lush",
  "raw","velour","shy","bold","bare","candid","dripping","plush","slow","sharp",
];
const NOUNS_A = [
  "midnight","ember","velvet","ribbon","silk","candle","mirror","shadow","whisper","perfume",
  "moon","fever","heat","echo","secret","kiss","dream","spark","flame","pulse",
  "hush","blush","ache","glance","murmur","tide","veil","crush","throne","halo",
];
const NOUNS_B = [
  "rose","wolf","tiger","fox","raven","lily","ash","poppy","silk","velvet",
  "thorn","cherry","wine","plum","amber","honey","lace","peach","violet","ivy",
  "storm","dusk","dawn","mist","sigh","glow","spell","crown","halo","feather",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSlug(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS_A)}-${pick(NOUNS_B)}`;
}

export const SLUG_REGEX = /^[a-z]+-[a-z]+-[a-z]+$/;
