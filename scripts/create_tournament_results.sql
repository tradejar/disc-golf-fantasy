-- Tournament results table — stores real-world MPO/FPO winners per event
CREATE TABLE IF NOT EXISTS tournament_results (
    id SERIAL PRIMARY KEY,
    tournament_id TEXT NOT NULL UNIQUE,
    tournament_name TEXT,
    mpo_winner TEXT,
    fpo_winner TEXT,
    mpo_score TEXT,      -- e.g. "-24" (total relative to par for all rounds)
    fpo_score TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with completed 2026 tournaments (update as season progresses)
INSERT INTO tournament_results (tournament_id, tournament_name, mpo_winner, fpo_winner, mpo_score, fpo_score)
VALUES
    ('96401', '2026 Discraft Supreme Flight Open', 'Ricky Wysocki',    'Catrina Allen',  '-22', '-18'),
    ('96402', '2026 MVP Big Easy Open',             'Paul McBeth',      'Paige Pierce',   '-19', '-15')
ON CONFLICT (tournament_id) DO UPDATE SET
    mpo_winner = EXCLUDED.mpo_winner,
    fpo_winner = EXCLUDED.fpo_winner,
    mpo_score  = EXCLUDED.mpo_score,
    fpo_score  = EXCLUDED.fpo_score,
    updated_at = NOW();

-- Enable RLS (public read, admin write)
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read tournament_results"
    ON tournament_results FOR SELECT USING (true);
