import { MessageHandler } from './pipeline';
import { checkAutoResponses } from '../automation/autoResponses';

export const autoResponsesHandler: MessageHandler = {
  name: 'autoResponses',
  async handle({ message, config }) {
    if (!config.automationEnabled) return;
    await checkAutoResponses(message, config);
  },
};
