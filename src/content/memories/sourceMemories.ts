import type { SourceMemoryRecord } from './types';

export const SOURCE_MEMORIES: readonly SourceMemoryRecord[] = [
  {
    id: 'memory.all-day-call', workingTitle: 'Through Every Emotion', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'Although sometimes you become sad, moody and difficult to handle but the way you try to listen, understand and keep glued to me is remarkable. I might have done really some great stuff in last birth to have a blessing like you.',
    approvedText: 'Even on days when you feel sad or moody, your effort to listen, understand, and stay close to me is remarkable. I must have done something truly wonderful in a past life to be blessed with someone as devoted as you.',
    authenticityNotes: ['Preserve deep emotional bond.'], boundaryNotes: ['Honor honest emotional transparency.'],
    assetReferences: ['procedural:all-day-call-path-cadence-v1'], interactionId: 'interaction.memory.all-day-call', implementationPhase: '7F', runtimeMemoryId: 'production.memory.all-day-call', futureAuthoringNotes: ['Focus on devotion and emotional understanding.'],
  },
  {
    id: 'memory.back', workingTitle: 'A Touch of Sanity', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'The way you always gently massage my foot and my head to keep me sane and relax in middle of all the company and project related stress and hell.',
    approvedText: 'In the middle of intense company deadlines and project stress, your gentle head and foot massages bring me back to sanity, easing every bit of tension.',
    authenticityNotes: ['Reflect genuine physical comfort and stress relief.'], boundaryNotes: ['Focus on comfort and relief.'],
    assetReferences: ['procedural:back-pavilion-accent-v1'], interactionId: 'interaction.memory.back', implementationPhase: '7C', runtimeMemoryId: 'production.memory.back', futureAuthoringNotes: ['Highlight peace amidst work stress.'],
  },
  {
    id: 'memory.boarding-passes', workingTitle: 'The Birthday Gift', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'The way you buy me gifts which I love and are my hobby like the PS Portal this birthday in 2026. I almost always love these things about you.',
    approvedText: 'You always pay attention to my hobbies and surprise me with gifts I truly love—like the PS Portal for my birthday in 2026. Your thoughtful care always touches my heart.',
    authenticityNotes: ['References the 2026 PS Portal birthday gift.'], boundaryNotes: ['Keep focus on thoughtful personal gifts.'],
    assetReferences: ['procedural:boarding-passes-collaboration-grid-v1'], interactionId: 'interaction.memory.boarding-passes', implementationPhase: '7G', runtimeMemoryId: 'production.memory.boarding-passes', futureAuthoringNotes: ['Focus on joyful personal hobby gifts.'],
  },
  {
    id: 'memory.mints', workingTitle: 'Warmth in Absence', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'When you cared for me a lot in absence when our parents were in Himachal and I was not required to work even a single thing. The tasty food you cooked for me to keep me full.',
    approvedText: 'When our parents were away in Himachal, you cared for me so completely that I did not have to worry about a single chore. The delicious food you cooked every day kept me warm and well fed.',
    authenticityNotes: ['Reflects Himachal trip care and home-cooked meals.'], boundaryNotes: ['Preserve gratitude for complete care.'],
    assetReferences: ['procedural:mints-dish-v1'], interactionId: 'interaction.memory.mints', implementationPhase: '7B', runtimeMemoryId: 'production.memory.mints', futureAuthoringNotes: ['Focus on selfless home care.'],
  },
  {
    id: 'memory.umbrella', workingTitle: 'Fried Rice & Love', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'Everytime you cook anything specially the fried rice whenever requested for me shows the love language you have for me.',
    approvedText: 'Whenever I request it, you happily cook for me—especially your delicious fried rice. Every time you prepare it, it speaks your love language loud and clear.',
    authenticityNotes: ['Highlights fried rice as her love language.'], boundaryNotes: ['Focus on cooking as love language.'],
    assetReferences: ['procedural:umbrella-path-accent-v1'], interactionId: 'interaction.memory.umbrella', implementationPhase: '7D', runtimeMemoryId: 'production.memory.umbrella', futureAuthoringNotes: ['Highlight culinary affection.'],
  },
  {
    id: 'memory.little-details', workingTitle: 'The Careless Days', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'The way you prepare my cloths always for the office and have everything for me sorted has made me so careless that I don\'t even know where my socks are.',
    approvedText: 'You prepare my office clothes so attentively every morning that I have become completely spoiled—I do not even know where my own socks are anymore!',
    authenticityNotes: ['Playful reflection on office clothing prep.'], boundaryNotes: ['Keep tone affectionate and humorous.'],
    assetReferences: ['procedural:little-details-inlay-v1'], interactionId: 'interaction.memory.little-details', implementationPhase: '7E', runtimeMemoryId: 'production.memory.little-details', futureAuthoringNotes: ['Highlight playful pampering.'],
  },
  {
    id: 'memory.friday-night', workingTitle: 'Family & Blessings', approvalStatus: 'approved', productionStatus: 'implemented', contentVersion: 2,
    originalText: 'The way you always support our mother and father post Shivani\'s marriage is really something I am proud of. Keep doing that as they also do a lot for us. Having a great family and bond with their blessings will always keep us happy and cared for.',
    approvedText: 'The way you support our mother and father post Shivani\'s marriage makes me immensely proud. Their blessings and our strong family bond will always keep our home full of happiness.',
    authenticityNotes: ['Reflects post-marriage parental support and family pride.'], boundaryNotes: ['Focus on family warmth and parental respect.'],
    assetReferences: ['procedural:friday-night-open-enclosure-v1'], interactionId: 'interaction.memory.friday-night', implementationPhase: '7H', runtimeMemoryId: 'production.memory.friday-night', futureAuthoringNotes: ['Focus on family unity and blessings.'],
  },
] as const;

export function getSourceMemory(id: SourceMemoryRecord['id']): SourceMemoryRecord {
  const memory = SOURCE_MEMORIES.find((record) => record.id === id);
  if (!memory) throw new Error(`Missing source memory: ${id}`);
  return memory;
}
