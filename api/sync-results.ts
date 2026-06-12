import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

interface Match {
  id: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
}

const LOCAL_MATCHES: Match[] = [
  // 1ª Rodada
  { id: "1", group: "A", homeTeam: "México", awayTeam: "África do Sul", date: "2026-06-11", time: "16:00" },
  { id: "2", group: "A", homeTeam: "Coreia do Sul", awayTeam: "República Tcheca", date: "2026-06-11", time: "23:00" },
  { id: "3", group: "B", homeTeam: "Canadá", awayTeam: "Bósnia", date: "2026-06-12", time: "16:00" },
  { id: "4", group: "D", homeTeam: "Estados Unidos", awayTeam: "Paraguai", date: "2026-06-12", time: "22:00" },
  { id: "5", group: "B", homeTeam: "Catar", awayTeam: "Suíça", date: "2026-06-13", time: "16:00" },
  { id: "6", group: "C", homeTeam: "Brasil", awayTeam: "Marrocos", date: "2026-06-13", time: "19:00" },
  { id: "7", group: "C", homeTeam: "Haiti", awayTeam: "Escócia", date: "2026-06-13", time: "22:00" },
  { id: "8", group: "D", homeTeam: "Austrália", awayTeam: "Turquia", date: "2026-06-14", time: "01:00" },
  { id: "9", group: "E", homeTeam: "Alemanha", awayTeam: "Curaçau", date: "2026-06-14", time: "14:00" },
  { id: "10", group: "F", homeTeam: "Holanda", awayTeam: "Japão", date: "2026-06-14", time: "17:00" },
  { id: "11", group: "E", homeTeam: "Costa do Marfim", awayTeam: "Equador", date: "2026-06-14", time: "20:00" },
  { id: "12", group: "F", homeTeam: "Suécia", awayTeam: "Tunísia", date: "2026-06-14", time: "23:00" },
  { id: "13", group: "H", homeTeam: "Espanha", awayTeam: "Cabo Verde", date: "2026-06-15", time: "13:00" },
  { id: "14", group: "G", homeTeam: "Bélgica", awayTeam: "Egito", date: "2026-06-15", time: "16:00" },
  { id: "15", group: "H", homeTeam: "Arábia Saudita", awayTeam: "Uruguai", date: "2026-06-15", time: "19:00" },
  { id: "16", group: "G", homeTeam: "Irã", awayTeam: "Nova Zelândia", date: "2026-06-15", time: "22:00" },
  { id: "17", group: "I", homeTeam: "França", awayTeam: "Senegal", date: "2026-06-16", time: "16:00" },
  { id: "18", group: "I", homeTeam: "Iraque", awayTeam: "Noruega", date: "2026-06-16", time: "19:00" },
  { id: "19", group: "J", homeTeam: "Argentina", awayTeam: "Argélia", date: "2026-06-16", time: "22:00" },
  { id: "20", group: "J", homeTeam: "Áustria", awayTeam: "Jordânia", date: "2026-06-17", time: "01:00" },
  { id: "21", group: "K", homeTeam: "Portugal", awayTeam: "Congo", date: "2026-06-17", time: "14:00" },
  { id: "22", group: "L", homeTeam: "Inglaterra", awayTeam: "Croácia", date: "2026-06-17", time: "17:00" },
  { id: "23", group: "L", homeTeam: "Gana", awayTeam: "Panamá", date: "2026-06-17", time: "20:00" },
  { id: "24", group: "K", homeTeam: "Uzbequistão", awayTeam: "Colômbia", date: "2026-06-17", time: "21:00" },

  // 2ª Rodada
  { id: "25", group: "A", homeTeam: "República Tcheca", awayTeam: "África do Sul", date: "2026-06-18", time: "13:00" },
  { id: "26", group: "B", homeTeam: "Suíça", awayTeam: "Bósnia", date: "2026-06-18", time: "16:00" },
  { id: "27", group: "B", homeTeam: "Canadá", awayTeam: "Catar", date: "2026-06-18", time: "19:00" },
  { id: "28", group: "A", homeTeam: "México", awayTeam: "Coreia do Sul", date: "2026-06-18", time: "22:00" },
  { id: "29", group: "D", homeTeam: "Turquia", awayTeam: "Paraguai", date: "2026-06-19", time: "00:00" },
  { id: "30", group: "D", homeTeam: "Estados Unidos", awayTeam: "Austrália", date: "2026-06-19", time: "16:00" },
  { id: "31", group: "C", homeTeam: "Escócia", awayTeam: "Marrocos", date: "2026-06-19", time: "19:00" },
  { id: "32", group: "C", homeTeam: "Brasil", awayTeam: "Haiti", date: "2026-06-19", time: "21:30" },
  { id: "33", group: "F", homeTeam: "Holanda", awayTeam: "Suécia", date: "2026-06-20", time: "14:00" },
  { id: "34", group: "E", homeTeam: "Alemanha", awayTeam: "Costa do Marfim", date: "2026-06-20", time: "17:00" },
  { id: "35", group: "E", homeTeam: "Equador", awayTeam: "Curaçau", date: "2026-06-20", time: "21:00" },
  { id: "36", group: "F", homeTeam: "Tunísia", awayTeam: "Japão", date: "2026-06-20", time: "23:00" },
  { id: "37", group: "H", homeTeam: "Espanha", awayTeam: "Arábia Saudita", date: "2026-06-21", time: "13:00" },
  { id: "38", group: "G", homeTeam: "Bélgica", awayTeam: "Irã", date: "2026-06-21", time: "16:00" },
  { id: "39", group: "H", homeTeam: "Uruguai", awayTeam: "Cabo Verde", date: "2026-06-21", time: "19:00" },
  { id: "40", group: "G", homeTeam: "Nova Zelândia", awayTeam: "Egito", date: "2026-06-21", time: "22:00" },
  { id: "41", group: "J", homeTeam: "Argentina", awayTeam: "Áustria", date: "2026-06-22", time: "14:00" },
  { id: "42", group: "I", homeTeam: "França", awayTeam: "Iraque", date: "2026-06-22", time: "18:00" },
  { id: "43", group: "I", homeTeam: "Noruega", awayTeam: "Senegal", date: "2026-06-22", time: "21:00" },
  { id: "44", group: "J", homeTeam: "Jordânia", awayTeam: "Argélia", date: "2026-06-23", time: "00:00" },
  { id: "45", group: "K", homeTeam: "Portugal", awayTeam: "Uzbequistão", date: "2026-06-23", time: "14:00" },
  { id: "46", group: "L", homeTeam: "Inglaterra", awayTeam: "Gana", date: "2026-06-23", time: "17:00" },
  { id: "47", group: "L", homeTeam: "Panamá", awayTeam: "Croácia", date: "2026-06-23", time: "20:00" },
  { id: "48", group: "K", homeTeam: "Colômbia", awayTeam: "Congo", date: "2026-06-23", time: "23:00" },

  // 3ª Rodada
  { id: "49", group: "B", homeTeam: "Suíça", awayTeam: "Canadá", date: "2026-06-24", time: "16:00" },
  { id: "50", group: "B", homeTeam: "Bósnia", awayTeam: "Catar", date: "2026-06-24", time: "16:00" },
  { id: "51", group: "C", homeTeam: "Escócia", awayTeam: "Brasil", date: "2026-06-24", time: "19:00" },
  { id: "52", group: "C", homeTeam: "Marrocos", awayTeam: "Haiti", date: "2026-06-24", time: "19:00" },
  { id: "53", group: "A", homeTeam: "República Tcheca", awayTeam: "México", date: "2026-06-24", time: "22:00" },
  { id: "54", group: "A", homeTeam: "África do Sul", awayTeam: "Coreia do Sul", date: "2026-06-24", time: "22:00" },
  { id: "55", group: "E", homeTeam: "Equador", awayTeam: "Alemanha", date: "2026-06-25", time: "17:00" },
  { id: "56", group: "E", homeTeam: "Curaçau", awayTeam: "Costa do Marfim", date: "2026-06-25", time: "17:00" },
  { id: "57", group: "F", homeTeam: "Japão", awayTeam: "Suécia", date: "2026-06-25", time: "20:00" },
  { id: "58", group: "F", homeTeam: "Tunísia", awayTeam: "Holanda", date: "2026-06-25", time: "20:00" },
  { id: "59", group: "D", homeTeam: "Turquia", awayTeam: "Estados Unidos", date: "2026-06-25", time: "23:00" },
  { id: "60", group: "D", homeTeam: "Paraguai", awayTeam: "Austrália", date: "2026-06-25", time: "23:00" },
  { id: "61", group: "I", homeTeam: "Noruega", awayTeam: "França", date: "2026-06-26", time: "16:00" },
  { id: "62", group: "I", homeTeam: "Senegal", awayTeam: "Iraque", date: "2026-06-26", time: "16:00" },
  { id: "63", group: "H", homeTeam: "Cabo Verde", awayTeam: "Arábia Saudita", date: "2026-06-26", time: "21:00" },
  { id: "64", group: "H", homeTeam: "Uruguai", awayTeam: "Espanha", date: "2026-06-26", time: "21:00" },
  { id: "65", group: "G", homeTeam: "Egito", awayTeam: "Irã", date: "2026-06-27", time: "00:00" },
  { id: "66", group: "G", homeTeam: "Nova Zelândia", awayTeam: "Bélgica", date: "2026-06-27", time: "00:00" },
  { id: "67", group: "L", homeTeam: "Panamá", awayTeam: "Inglaterra", date: "2026-06-27", time: "18:00" },
  { id: "68", group: "L", homeTeam: "Croácia", awayTeam: "Gana", date: "2026-06-27", time: "18:00" },
  { id: "69", group: "K", homeTeam: "Colômbia", awayTeam: "Portugal", date: "2026-06-27", time: "20:30" },
  { id: "70", group: "K", homeTeam: "Congo", awayTeam: "Uzbequistão", date: "2026-06-27", time: "20:30" },
  { id: "71", group: "J", homeTeam: "Argélia", awayTeam: "Áustria", date: "2026-06-27", time: "23:00" },
  { id: "72", group: "J", homeTeam: "Jordânia", awayTeam: "Argentina", date: "2026-06-27", time: "23:00" }
];

// Inicializa o Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dicionário de tradução: Nome em português local -> Nome na API Football-Data
const TEAM_TRANSLATIONS: Record<string, string[]> = {
  "México": ["Mexico"],
  "África do Sul": ["South Africa"],
  "Coreia do Sul": ["South Korea"],
  "República Tcheca": ["Czechia", "Czech Republic"],
  "Canadá": ["Canada"],
  "Bósnia": ["Bosnia", "Bosnia and Herzegovina", "Bosnia-Herzegovina"],
  "Estados Unidos": ["USA", "United States"],
  "Paraguai": ["Paraguay"],
  "Catar": ["Qatar"],
  "Suíça": ["Switzerland"],
  "Brasil": ["Brazil"],
  "Marrocos": ["Morocco"],
  "Haiti": ["Haiti"],
  "Escócia": ["Scotland"],
  "Austrália": ["Australia"],
  "Turquia": ["Turkey", "Türkiye"],
  "Alemanha": ["Germany"],
  "Curaçau": ["Curacao", "Curaçao"],
  "Holanda": ["Netherlands"],
  "Japão": ["Japan"],
  "Costa do Marfim": ["Ivory Coast", "Côte d'Ivoire"],
  "Equador": ["Ecuador"],
  "Suécia": ["Sweden"],
  "Tunísia": ["Tunisia"],
  "Espanha": ["Spain"],
  "Cabo Verde": ["Cape Verde", "Cabo Verde"],
  "Bélgica": ["Belgium"],
  "Egito": ["Egypt"],
  "Uruguai": ["Uruguay"],
  "Arábia Saudita": ["Saudi Arabia"],
  "Irã": ["Iran"],
  "Nova Zelândia": ["New Zealand"],
  "França": ["France"],
  "Senegal": ["Senegal"],
  "Iraque": ["Iraq"],
  "Noruega": ["Norway"],
  "Argentina": ["Argentina"],
  "Argélia": ["Algeria"],
  "Áustria": ["Austria"],
  "Jordânia": ["Jordan"],
  "Portugal": ["Portugal"],
  "Congo": ["Congo", "Congo DR", "DR Congo"],
  "Inglaterra": ["England"],
  "Croácia": ["Croatia"],
  "Gana": ["Ghana"],
  "Panamá": ["Panama"],
  "Uzbequistão": ["Uzbekistan"],
  "Colômbia": ["Colombia"]
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchTeam(localName: string, apiName: string): boolean {
  const translations = TEAM_TRANSLATIONS[localName];
  if (translations) {
    if (translations.some(t => t.toLowerCase() === apiName.toLowerCase())) {
      return true;
    }
  }
  return normalizeName(localName) === normalizeName(apiName);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validação de Segurança
  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret;

  if (process.env.CRON_SECRET) {
    const isHeaderValid = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isQueryValid = querySecret === process.env.CRON_SECRET;

    if (!isHeaderValid && !isQueryValid) {
      return res.status(401).json({ error: 'Unauthorized CRON execution' });
    }
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY || process.env.API_SPORTS_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API token is not configured.' });
  }

  try {
    console.log(`Buscando fixtures da Copa do Mundo na Football-Data.org...`);
    
    // WC é o código fixo para World Cup na Football-Data
    const response = await fetch(`https://api.football-data.org/v4/competitions/WC/matches`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': apiKey,
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na Football-Data API: Status ${response.status}`);
    }

    const data = await response.json();
    const matches = data.matches || [];

    if (matches.length === 0) {
      return res.status(200).json({ message: 'Nenhuma partida retornada pela API.', count: 0 });
    }

    const localMatches = LOCAL_MATCHES;
    const updates: { match_id: string; home_score: number; away_score: number; updated_at: string }[] = [];

    // Percorre as partidas da API
    for (const apiMatch of matches) {
      const { status, score } = apiMatch;
      
      // Filtra apenas se estiver em andamento (IN_PLAY, PAUSED) ou terminado (FINISHED)
      const allowedStatuses = ['IN_PLAY', 'PAUSED', 'FINISHED'];
      if (!allowedStatuses.includes(status)) {
        continue;
      }

      const apiHomeTeam = apiMatch.homeTeam.name;
      const apiAwayTeam = apiMatch.awayTeam.name;
      
      // fullTime é o nó que armazena os gols do jogo regular na v4
      const homeGoals = score.fullTime.home;
      const awayGoals = score.fullTime.away;

      if (homeGoals === null || awayGoals === null) {
        continue;
      }

      // Procura a partida correspondente na nossa lista local
      const matchedLocalMatch = localMatches.find(lm => 
        matchTeam(lm.homeTeam, apiHomeTeam) && matchTeam(lm.awayTeam, apiAwayTeam)
      );

      if (matchedLocalMatch) {
        updates.push({
          match_id: matchedLocalMatch.id,
          home_score: homeGoals,
          away_score: awayGoals,
          updated_at: new Date().toISOString()
        });
      } else {
        console.warn(`Não mapeado: ${apiHomeTeam} vs ${apiAwayTeam}`);
      }
    }

    if (updates.length === 0) {
      return res.status(200).json({ message: 'Nenhum placar de jogo em andamento ou terminado para atualizar.', updatedCount: 0 });
    }

    console.log(`Atualizando ${updates.length} partidas no Supabase...`);

    // Faz upsert na tabela results
    const { error: upsertError } = await supabase
      .from('results')
      .upsert(updates, { onConflict: 'match_id' });

    if (upsertError) {
      throw upsertError;
    }

    return res.status(200).json({
      message: 'Resultados sincronizados com sucesso!',
      updatedCount: updates.length,
      updatedMatches: updates
    });

  } catch (error: any) {
    console.error('Erro ao sincronizar resultados:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor' });
  }
}
