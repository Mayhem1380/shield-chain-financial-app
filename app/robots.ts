import type { MetadataRoute } from 'next';

/**
 * Public crawler preferences. This is a voluntary signal, NOT access control.
 * Keep private beta routes protected with authentication at the server/network layer.
 */
export default function robots(): MetadataRoute.Robots {
  const aiTrainingCrawlers = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
    'Google-Extended', 'CCBot', 'Bytespider', 'Amazonbot', 'Applebot-Extended',
    'FacebookBot', 'Diffbot', 'PerplexityBot', 'YouBot', 'cohere-ai', 'ImagesiftBot',
  ];

  return {
    rules: aiTrainingCrawlers.map((userAgent) => ({ userAgent, disallow: '/' })),
    // Ordinary search crawlers are not blocked by this policy.
  };
}
