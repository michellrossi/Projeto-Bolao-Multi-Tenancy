import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_2026_ROUNDS } from '../src/lib/matches';

// Inicializa o cliente Supabase com a Service Role Key para ignorar RLS e atualizar a tabela results
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dicionário de tradução: Nome em português no matches.ts -> Nome retornado pela API-Sports (geralmente em inglês)
const TEAM_TRANSLATIONS: Record<string, string[]> = {
  "México": ["Mexico"],
  "África do Sul": ["South Africa"],
  "Coreia do Sul": ["South Korea"],
  "República Tcheca": ["Czechia", "Czech Republic"],
  "Canadá": ["Canada"],
  "Bósnia": ["Bosnia", "Bosnia and Herzegovina"],
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

// Função auxiliar para normalizar nomes para comparação secundária caso não estejam no dicionário
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, "");     // remove caracteres especiais e espaços
}

// Verifica se dois nomes de times batem (usando dicionário ou normalização)
function matchTeam(localName: string, apiName: string): boolean {
  // 1. Tenta pelo dicionário de traduções
  const translations = TEAM_TRANSLATIONS[localName];
  if (translations) {
    if (translations.some(t => t.toLowerCase() === apiName.toLowerCase())) {
      return true;
    }
  }
  
  // 2. Fallback por normalização aproximada
  return normalizeName(localName) === normalizeName(apiName);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Segurança para evitar chamadas de terceiros (opcional, recomendado para rotas cron)
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized CRON execution' });
  }

  const apiKey = process.env.API_SPORTS_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API_SPORTS_KEY is not configured in environment variables.' });
  }

  // ID padrão da Copa do Mundo na API-Sports é 1. Temporada é 2026.
  const leagueId = process.env.API_SPORTS_LEAGUE || '1';
  const season = process.env.API_SPORTS_SEASON || '2026';

  try {
    console.log(`Buscando fixtures da liga ${leagueId}, temporada ${season}...`);
    
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}`, {
      method: 'GET',
      headers: {
        'x-apisports-key': apiKey,
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na API-Sports: Status ${response.status}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    if (fixtures.length === 0) {
      return res.status(200).json({ message: 'Nenhuma partida retornada pela API.', count: 0 });
    }

    // Extrai todas as nossas partidas locais para cruzar
    const localMatches = WORLD_CUP_2026_ROUNDS.flatMap(round => round.matches);
    const updates: { match_id: string; home_score: number; away_score: number; updated_at: string }[] = [];

    // Percorre as partidas vindas da API
    for (const fixture of fixtures) {
      const { status, goals } = fixture;
      
      // Apenas processa se a partida já encerrou (FT = Full Time, AET = After Extra Time, PEN = Penalty)
      const finishedStatuses = ['FT', 'AET', 'PEN'];
      if (!finishedStatuses.includes(status.short)) {
        continue;
      }

      const apiHomeTeam = fixture.teams.home.name;
      const apiAwayTeam = fixture.teams.away.name;
      const homeGoals = goals.home;
      const awayGoals = goals.away;

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
        console.warn(`Não foi possível mapear localmente: ${apiHomeTeam} vs ${apiAwayTeam}`);
      }
    }

    if (updates.length === 0) {
      return res.status(200).json({ message: 'Nenhuma nova partida terminada para atualizar.', updatedCount: 0 });
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
