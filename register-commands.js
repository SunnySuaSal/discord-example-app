import fetch from 'node-fetch';
import 'dotenv/config';

const APPLICATION_ID = process.env.APP_ID;
const GUILD_ID = process.env.GUILD_ID; // For testing, use a specific server
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bot ${DISCORD_TOKEN}`,
};

// Define the commands
const commands = [
  {
    name: 'test',
    description: 'A test command',
  },
  {
    name: 'roll',
    description: 'Roll some dice! Format: XdY (e.g., 2d20)',
    options: [
      {
        name: 'notation',
        description: 'Dice notation like 2d20 or 1d6',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'challenge',
    description: 'Challenge someone to rock-paper-scissors!',
    options: [
      {
        name: 'object',
        description: 'Choose your object (rock, paper, scissors)',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Rock', value: 'rock' },
          { name: 'Paper', value: 'paper' },
          { name: 'Scissors', value: 'scissors' },
        ],
      },
    ],
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(commands),
  });

  if (res.ok) {
    console.log('✅ Commands registered successfully!');
  } else {
    const error = await res.text();
    console.error('❌ Failed to register commands:', error);
  }
}

registerCommands();