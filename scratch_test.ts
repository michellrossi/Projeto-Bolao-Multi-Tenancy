import { getUserKnockoutTeam } from './src/lib/scoring';
import { KNOCKOUT_MATCHES } from './src/lib/knockout';

const mockPredictions = {
  "M13": { home: 2, away: 1 }, // África do Sul (Venceu) x Canadá
  "M9": { home: 2, away: 1 },  // Brasil (Venceu) x Japão
  "M10": { home: 0, away: 3 }, // C. do Marfim x Noruega (Venceu)
};

console.log("=== TESTE DE RESOLUÇÃO DO CHAVEAMENTO ===");
console.log("Jogo O7 - Home (Vencedor Jogo M13):", getUserKnockoutTeam("Vencedor Jogo M13", mockPredictions, KNOCKOUT_MATCHES));
console.log("Jogo O5 - Home (Vencedor Jogo M9):", getUserKnockoutTeam("Vencedor Jogo M9", mockPredictions, KNOCKOUT_MATCHES));
console.log("Jogo O5 - Away (Vencedor Jogo M10):", getUserKnockoutTeam("Vencedor Jogo M10", mockPredictions, KNOCKOUT_MATCHES));
