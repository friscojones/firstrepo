/**
 * Script to populate KV store with sample sentences for testing
 * Run with: node populate-sentences.js
 * 
 * Note: This requires wrangler CLI to be installed and authenticated
 */

const { execSync } = require('child_process');

// Age-appropriate sentences for 5th grade students (ages 10-11)
// Covers various subjects and themes relevant to their curriculum and interests
const sentences = [
  // Week 1 - October 2024
  {
    date: '2024-10-25',
    sentence: 'The quick brown fox jumps over the lazy dog',
    difficulty: 'easy'
  },
  {
    date: '2024-10-26',
    sentence: 'Learning is a treasure that will follow its owner everywhere',
    difficulty: 'medium'
  },
  {
    date: '2024-10-27',
    sentence: 'Every student can learn and succeed with practice and determination',
    difficulty: 'medium'
  },
  {
    date: '2024-10-28',
    sentence: 'Reading opens doors to new worlds and adventures',
    difficulty: 'easy'
  },
  {
    date: '2024-10-29',
    sentence: 'Mathematics helps us understand patterns in the world around us',
    difficulty: 'hard'
  },
  {
    date: '2024-10-30',
    sentence: 'Science teaches us to ask questions and find answers through experiments',
    difficulty: 'hard'
  },
  {
    date: '2024-10-31',
    sentence: 'Halloween is a fun time for costumes and trick or treating',
    difficulty: 'easy'
  },
  
  // Week 2 - November 2024
  {
    date: '2024-11-01',
    sentence: 'November brings cooler weather and beautiful autumn leaves',
    difficulty: 'medium'
  },
  {
    date: '2024-11-02',
    sentence: 'Friendship means being kind and helpful to others',
    difficulty: 'easy'
  },
  {
    date: '2024-11-03',
    sentence: 'Practice makes perfect when learning new skills',
    difficulty: 'easy'
  },
  {
    date: '2024-11-04',
    sentence: 'The solar system has eight planets orbiting around the sun',
    difficulty: 'medium'
  },
  {
    date: '2024-11-05',
    sentence: 'Democracy means everyone gets a voice in important decisions',
    difficulty: 'hard'
  },
  {
    date: '2024-11-06',
    sentence: 'Animals adapt to their environment to survive and thrive',
    difficulty: 'medium'
  },
  {
    date: '2024-11-07',
    sentence: 'Books can transport us to magical places and exciting adventures',
    difficulty: 'easy'
  },
  
  // Week 3 - November 2024
  {
    date: '2024-11-08',
    sentence: 'Teamwork makes difficult tasks easier and more fun to complete',
    difficulty: 'medium'
  },
  {
    date: '2024-11-09',
    sentence: 'The water cycle includes evaporation condensation and precipitation',
    difficulty: 'hard'
  },
  {
    date: '2024-11-10',
    sentence: 'Veterans Day honors the brave men and women who served our country',
    difficulty: 'medium'
  },
  {
    date: '2024-11-11',
    sentence: 'Fractions help us understand parts of a whole number',
    difficulty: 'easy'
  },
  {
    date: '2024-11-12',
    sentence: 'The American Revolution began when colonists wanted independence from Britain',
    difficulty: 'hard'
  },
  {
    date: '2024-11-13',
    sentence: 'Plants need sunlight water and nutrients to grow healthy and strong',
    difficulty: 'medium'
  },
  {
    date: '2024-11-14',
    sentence: 'Creative writing lets us express our thoughts and imagination',
    difficulty: 'easy'
  },
  
  // Week 4 - November 2024
  {
    date: '2024-11-15',
    sentence: 'Geography teaches us about different countries cultures and landscapes',
    difficulty: 'medium'
  },
  {
    date: '2024-11-16',
    sentence: 'Multiplication is repeated addition that makes math calculations faster',
    difficulty: 'medium'
  },
  {
    date: '2024-11-17',
    sentence: 'The human body has many systems that work together perfectly',
    difficulty: 'hard'
  },
  {
    date: '2024-11-18',
    sentence: 'Music and art help us express feelings and connect with others',
    difficulty: 'easy'
  },
  {
    date: '2024-11-19',
    sentence: 'Thanksgiving reminds us to be grateful for family friends and food',
    difficulty: 'medium'
  },
  {
    date: '2024-11-20',
    sentence: 'Native Americans were the first people to live in North America',
    difficulty: 'medium'
  },
  {
    date: '2024-11-21',
    sentence: 'Kindness costs nothing but means everything to someone who needs it',
    difficulty: 'easy'
  },
  
  // Week 5 - December 2024
  {
    date: '2024-12-01',
    sentence: 'December brings winter holidays and time with family and friends',
    difficulty: 'easy'
  },
  {
    date: '2024-12-02',
    sentence: 'Ecosystems are communities where plants and animals depend on each other',
    difficulty: 'hard'
  },
  {
    date: '2024-12-03',
    sentence: 'Problem solving requires patience creativity and logical thinking',
    difficulty: 'medium'
  },
  {
    date: '2024-12-04',
    sentence: 'The Constitution is the supreme law that governs our nation',
    difficulty: 'hard'
  },
  {
    date: '2024-12-05',
    sentence: 'Exercise keeps our bodies healthy and our minds sharp and focused',
    difficulty: 'medium'
  },
  {
    date: '2024-12-06',
    sentence: 'Inventors create new things that make life easier and better',
    difficulty: 'easy'
  },
  {
    date: '2024-12-07',
    sentence: 'Fossils are evidence of plants and animals from long ago',
    difficulty: 'medium'
  },
  
  // Additional sentences for variety
  {
    date: '2024-12-08',
    sentence: 'Respect means treating others the way you want to be treated',
    difficulty: 'easy'
  },
  {
    date: '2024-12-09',
    sentence: 'Electricity flows through circuits to power lights and machines',
    difficulty: 'medium'
  },
  {
    date: '2024-12-10',
    sentence: 'The Bill of Rights protects important freedoms for all Americans',
    difficulty: 'hard'
  }
];

console.log('Populating KV store with sample sentences...');

sentences.forEach(({ date, sentence, difficulty }) => {
  const key = `sentence:${date}`;
  const value = JSON.stringify({ sentence, difficulty });
  
  try {
    const command = `wrangler kv:key put --binding=SENTENCES_KV "${key}" '${value}'`;
    console.log(`Adding sentence for ${date}...`);
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to add sentence for ${date}:`, error.message);
  }
});

console.log('Finished populating sentences!');
console.log('\nTo verify, you can list all keys with:');
console.log('wrangler kv:key list --binding=SENTENCES_KV');