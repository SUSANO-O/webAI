/** Catálogo de recompensas WEB 360 (base; el Protocolo Ajedrez multiplica). */
export const WEB_AI_REWARDS = {
  'wai-generate': { label: 'Generar website', reward: 25, symbol: 'WAI', type: 'VERTICAL' },
  'wai-save': { label: 'Guardar template', reward: 40, symbol: 'WAI', type: 'VERTICAL' },
  'wai-download': { label: 'Descargar HTML', reward: 30, symbol: 'WAI', type: 'VERTICAL' },
  'wai-refine': { label: 'Refinar con IA', reward: 20, symbol: 'WAI', type: 'VERTICAL' },
  'wai-publish': { label: 'Publicar sitio', reward: 35, symbol: 'WAI', type: 'VERTICAL' },
  'wai-kyc': { label: 'Completar perfil', reward: 15, symbol: 'GLB', type: 'GLOBAL' },
} as const;

export type WebAiTaskId = keyof typeof WEB_AI_REWARDS;

export function rewardPoints(taskId: WebAiTaskId, multiplier = 1) {
  const base = WEB_AI_REWARDS[taskId].reward;
  const m = Number(multiplier) > 0 ? Number(multiplier) : 1;
  const effective = Math.round(base * m * 100) / 100;
  return {
    base,
    effective,
    symbol: WEB_AI_REWARDS[taskId].symbol,
    multiplier: m,
  };
}

export function formatRewardLabel(taskId: WebAiTaskId, multiplier = 1) {
  const { effective, symbol } = rewardPoints(taskId, multiplier);
  const n = Number.isInteger(effective) ? String(effective) : effective.toFixed(1);
  return `+${n} ${symbol}`;
}
