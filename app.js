import 'dotenv/config';
import express from 'express';
import {
  ButtonStyleTypes,
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { getShuffledOptions, getResult } from './game.js';

const app = express();
const PORT = process.env.PORT || 3000;

const activeGames = {};

// Interactions endpoint
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async (req, res) => {
  const { id, type, data } = req.body;

  // Respond to ping from Discord
  if (type === InteractionType.PING) {
    return res.json({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'test') {
      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `hello world ${getRandomEmoji()}`,
        },
      });
    } else if (name === 'roll') {
      const notation = data.options?.[0]?.value;

      if (!notation) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Missing dice notation. Use the format like 2d20 or 1d4.',
          },
        });
      }

      const match = notation.match(/^(\d+)d(\d+)$/i);

      if (!match) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Invalid notation. Use the format like 2d20 or 1d4.',
          },
        });
      }

      const [_, countStr, sidesStr] = match;
      const count = parseInt(countStr);
      const sides = parseInt(sidesStr);

      if (count < 1 || count > 100 || sides < 2 || sides > 1000) {
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Number of dice must be 1–100 and sides must be 2–1000.',
          },
        });
      }

      const rolls = Array.from({ length: count }, () =>
        Math.floor(Math.random() * sides) + 1
      );
      const total = rolls.reduce((a, b) => a + b, 0);

      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `🎲 You rolled: ${rolls.join(', ')} (Total: ${total})`,
        },
      });
    } else if (name === 'challenge' && id) {
      const context = req.body.context;
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
      const objectName = req.body.data.options?.[0]?.value;

      activeGames[id] = {
        id: userId,
        objectName,
      };

      return res.json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Rock papers scissors challenge from <@${userId}>`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  custom_id: `accept_button_${req.body.id}`,
                  label: 'Accept',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    } else {
      console.error(`Unknown command: ${name}`);
      return res.status(400).json({ error: 'Unknown command' });
    }
  }

  // Handle component interactions (e.g., button clicks)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const componentId = data.custom_id;

    if (componentId.startsWith('accept_button_')) {
      const gameId = componentId.replace('accept_button_', '');
      const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

      try {
        await res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'What is your object of choice?',
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.STRING_SELECT,
                    custom_id: `select_choice_${gameId}`,
                    options: getShuffledOptions(),
                  },
                ],
              },
            ],
          },
        });

        await DiscordRequest(endpoint, { method: 'DELETE' });
      } catch (err) {
        console.error('Error sending message:', err);
      }

      return;
    }

    console.error(`Unknown component interaction: ${componentId}`);
    return res.status(400).json({ error: 'Unknown component interaction' });
  }

  console.error('Unknown interaction type:', type);
  return res.status(400).json({ error: 'Unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});