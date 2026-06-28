export interface KnockoutMatch {
  id: string;
  phase: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  homeTeam?: string;
  awayTeam?: string;
  date: string;
  time: string;
}

export const KNOCKOUT_MATCHES: KnockoutMatch[] = [
  // FASE MATA-MATA (Round of 32)
  { id: "M1", phase: "Mata-Mata", homePlaceholder: "Argentina", awayPlaceholder: "Cabo Verde", homeTeam: "Argentina", awayTeam: "Cabo Verde", date: "2026-07-03", time: "19:00" },
  { id: "M2", phase: "Mata-Mata", homePlaceholder: "Austrália", awayPlaceholder: "Egito", homeTeam: "Austrália", awayTeam: "Egito", date: "2026-07-03", time: "15:00" },
  { id: "M3", phase: "Mata-Mata", homePlaceholder: "Suíça", awayPlaceholder: "Argélia", homeTeam: "Suíça", awayTeam: "Argélia", date: "2026-07-03", time: "00:00" },
  { id: "M4", phase: "Mata-Mata", homePlaceholder: "Colômbia", awayPlaceholder: "Gana", homeTeam: "Colômbia", awayTeam: "Gana", date: "2026-07-03", time: "22:30" },
  { id: "M5", phase: "Mata-Mata", homePlaceholder: "Portugal", awayPlaceholder: "Croácia", homeTeam: "Portugal", awayTeam: "Croácia", date: "2026-07-02", time: "20:00" },
  { id: "M6", phase: "Mata-Mata", homePlaceholder: "Espanha", awayPlaceholder: "Áustria", homeTeam: "Espanha", awayTeam: "Áustria", date: "2026-07-02", time: "16:00" },
  { id: "M7", phase: "Mata-Mata", homePlaceholder: "EUA", awayPlaceholder: "Bósnia e H.", homeTeam: "EUA", awayTeam: "Bósnia e H.", date: "2026-07-01", time: "21:00" },
  { id: "M8", phase: "Mata-Mata", homePlaceholder: "Bélgica", awayPlaceholder: "Senegal", homeTeam: "Bélgica", awayTeam: "Senegal", date: "2026-07-01", time: "17:00" },
  
  { id: "M9", phase: "Mata-Mata", homePlaceholder: "Brasil", awayPlaceholder: "Japão", homeTeam: "Brasil", awayTeam: "Japão", date: "2026-06-29", time: "14:00" },
  { id: "M10", phase: "Mata-Mata", homePlaceholder: "C. do Marfim", awayPlaceholder: "Noruega", homeTeam: "C. do Marfim", awayTeam: "Noruega", date: "2026-06-30", time: "14:00" },
  { id: "M11", phase: "Mata-Mata", homePlaceholder: "México", awayPlaceholder: "Equador", homeTeam: "México", awayTeam: "Equador", date: "2026-06-30", time: "22:00" },
  { id: "M12", phase: "Mata-Mata", homePlaceholder: "Inglaterra", awayPlaceholder: "R.D. Congo", homeTeam: "Inglaterra", awayTeam: "R.D. Congo", date: "2026-07-01", time: "13:00" },
  { id: "M13", phase: "Mata-Mata", homePlaceholder: "África do Sul", awayPlaceholder: "Canadá", homeTeam: "África do Sul", awayTeam: "Canadá", date: "2026-06-28", time: "16:00" },
  { id: "M14", phase: "Mata-Mata", homePlaceholder: "Holanda", awayPlaceholder: "Marrocos", homeTeam: "Holanda", awayTeam: "Marrocos", date: "2026-06-29", time: "22:00" },
  { id: "M15", phase: "Mata-Mata", homePlaceholder: "Alemanha", awayPlaceholder: "Paraguai", homeTeam: "Alemanha", awayTeam: "Paraguai", date: "2026-06-29", time: "17:30" },
  { id: "M16", phase: "Mata-Mata", homePlaceholder: "França", awayPlaceholder: "Suécia", homeTeam: "França", awayTeam: "Suécia", date: "2026-06-30", time: "18:00" },

  // OITAVAS DE FINAL
  { id: "O1", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M1", awayPlaceholder: "Vencedor Jogo M2", date: "2026-07-07", time: "16:00" },
  { id: "O2", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M3", awayPlaceholder: "Vencedor Jogo M4", date: "2026-07-07", time: "16:00" },
  { id: "O3", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M5", awayPlaceholder: "Vencedor Jogo M6", date: "2026-07-06", time: "16:00" },
  { id: "O4", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M7", awayPlaceholder: "Vencedor Jogo M8", date: "2026-07-06", time: "16:00" },
  { id: "O5", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M9", awayPlaceholder: "Vencedor Jogo M10", date: "2026-07-05", time: "16:00" },
  { id: "O6", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M11", awayPlaceholder: "Vencedor Jogo M12", date: "2026-07-05", time: "16:00" },
  { id: "O7", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M13", awayPlaceholder: "Vencedor Jogo M14", date: "2026-07-04", time: "16:00" },
  { id: "O8", phase: "Oitavas", homePlaceholder: "Vencedor Jogo M15", awayPlaceholder: "Vencedor Jogo M16", date: "2026-07-04", time: "16:00" },

  // QUARTAS DE FINAL
  { id: "Q1", phase: "Quartas", homePlaceholder: "Vencedor O1", awayPlaceholder: "Vencedor O2", date: "2026-07-11", time: "16:00" },
  { id: "Q2", phase: "Quartas", homePlaceholder: "Vencedor O3", awayPlaceholder: "Vencedor O4", date: "2026-07-10", time: "16:00" },
  { id: "Q3", phase: "Quartas", homePlaceholder: "Vencedor O5", awayPlaceholder: "Vencedor O6", date: "2026-07-11", time: "16:00" },
  { id: "Q4", phase: "Quartas", homePlaceholder: "Vencedor O7", awayPlaceholder: "Vencedor O8", date: "2026-07-09", time: "16:00" },

  // SEMIFINAIS
  { id: "S1", phase: "Semifinais", homePlaceholder: "Vencedor Q1", awayPlaceholder: "Vencedor Q2", date: "2026-07-15", time: "16:00" },
  { id: "S2", phase: "Semifinais", homePlaceholder: "Vencedor Q3", awayPlaceholder: "Vencedor Q4", date: "2026-07-14", time: "16:00" },

  // FINAIS
  { id: "F3", phase: "Final", homePlaceholder: "Perdedor S1", awayPlaceholder: "Perdedor S2", date: "2026-07-18", time: "18:00" },
  { id: "F1", phase: "Final", homePlaceholder: "Vencedor S1", awayPlaceholder: "Vencedor S2", date: "2026-07-19", time: "16:00" },
];
