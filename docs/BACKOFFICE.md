# Documentation Back Office — Boardgamers

## Table des matières

1. [Vue d'ensemble de la base de données](#1-vue-densemble-de-la-base-de-données)
2. [Dashboard — Requêtes SQL](#2-dashboard--requêtes-sql)
3. [Gestion des contestations La Couronne](#3-gestion-des-contestations-la-couronne)
4. [Gestion des PV (Points de Victoire)](#4-gestion-des-pv-points-de-victoire)
5. [Formules de calcul PV](#5-formules-de-calcul-pv)
6. [Tables et outils utiles](#6-tables-et-outils-utiles)
7. [RPC disponibles](#7-rpc-disponibles)

---

## 1. Vue d'ensemble de la base de données

### Utilisateurs

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (username, avatar, city, role...) |
| `friendships` | Relations d'amitié (pending/accepted) |
| `player_reviews` | Avis entre joueurs (rating 1-5 + commentaire) |

**profiles — colonnes clés :**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK, lié à `auth.users` |
| `username` | text | Pseudo unique |
| `avatar_url` | text | URL de l'avatar |
| `city` | text | Ville du joueur (texte libre) |
| `department` | text | Département |
| `latitude` / `longitude` | float | Coordonnées du profil |
| `role` | text | `'user'` / `'moderator'` / `'admin'` |
| `reliability_score` | int | Score de fiabilité (0-100) |
| `created_at` | timestamptz | Date d'inscription |

---

### Événements

| Table | Description |
|-------|-------------|
| `events` | Événements de jeu (soirées, sessions) |
| `event_participants` | Inscriptions aux événements |
| `event_messages` | Chat de groupe des événements |
| `event_preset_players` | Joueurs pré-inscrits par nom |
| `saved_places` | Lieux sauvegardés par les utilisateurs |

**events — colonnes clés :**

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `organiser_id` | UUID | FK → profiles |
| `game_id` | UUID | FK → bgg_games_cache (nullable) |
| `title` | text | Titre de l'événement |
| `city` | text | Ville de l'événement |
| `starts_at` | timestamptz | Date/heure de début |
| `is_competitive` | bool | Lié à La Couronne |
| `status` | text | Statut de l'événement |
| `spots_available` | int | Places restantes |

**event_participants.status** : `'inscrit'` | `'confirme'` | `'annule'` | `'invite'`

---

### La Couronne — Tables compétitives

| Table | Description |
|-------|-------------|
| `competitive_matches` | Parties compétitives |
| `competitive_match_participants` | Joueurs dans les parties + résultats PV |
| `player_city_game_elo` | PV par joueur × ville × jeu × saison |
| `player_city_global_elo` | PV global par joueur × ville × saison (cache) |
| `territories` | Champion global par ville × saison |
| `game_champions` | Champion par jeu × ville × saison |
| `territory_history` | Historique des conquêtes/défenses |
| `user_badges` | Succès débloqués |
| `cities` | Villes enregistrées |
| `seasons` | Saisons compétitives |

#### competitive_matches

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `city_id` | UUID | FK → cities (nullable, dérivée du créateur) |
| `creator_id` | UUID | FK → profiles |
| `game_id` | UUID | FK → bgg_games_cache |
| `join_code` | text | Code 6 caractères pour rejoindre |
| `match_type` | text | `'1v1'` / `'ffa'` / `'teams'` |
| `has_referee` | bool | Présence d'un arbitre |
| `status` | text | `'lobby'` / `'in_progress'` / `'completed'` / `'cancelled'` |
| `started_at` | timestamptz | Début de la partie |
| `completed_at` | timestamptz | Fin de la partie |
| `duration_seconds` | int | Durée calculée |
| `results_declared_by` | UUID | Qui a déclaré les résultats |
| `results_pending_confirmation` | bool | En attente de vote majoritaire |
| `is_draw` | bool | Match nul (0 PV pour tous) |
| `season_id` | UUID | FK → seasons |

#### competitive_match_participants

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | PK |
| `match_id` | UUID | FK → competitive_matches |
| `user_id` | UUID | FK → profiles |
| `role` | text | `'player'` / `'referee'` |
| `team_id` | int | Numéro d'équipe (null si FFA/1v1) |
| `placement` | int | Classement final (1 = gagnant) |
| `elo_before` | int | PV avant la partie |
| `elo_after` | int | PV après la partie |
| `elo_change` | int | Delta PV (positif = gain) |
| `result_confirmed` | bool/null | Vote : `true` = confirme, `false` = conteste, `null` = pas encore voté |
| `cancel_vote` | bool/null | Vote d'annulation |

#### player_city_game_elo (PV par jeu)

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | PK composite |
| `city_id` | UUID | PK composite |
| `season_id` | UUID | PK composite |
| `game_id` | UUID | PK composite |
| `current_elo` | int | PV actuel (floor à 0) |
| `peak_elo` | int | PV maximum atteint |
| `total_matches` | int | Nombre total de parties |
| `wins` | int | Victoires |
| `losses` | int | Défaites |

#### player_city_global_elo (PV global — cache)

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | PK composite |
| `city_id` | UUID | PK composite |
| `season_id` | UUID | PK composite |
| `global_elo` | int | Somme des `current_elo` de tous les jeux |
| `distinct_games` | int | Nombre de jeux distincts joués |
| `total_matches` | int | Total des parties tous jeux confondus |
| `is_eligible_champion` | bool | `true` si `distinct_games >= 3` |

> **Note :** Les noms de colonnes contiennent "elo" pour des raisons historiques. L'UI et le code TypeScript utilisent "PV" (Points de Victoire).

---

### Jeux

| Table | Description |
|-------|-------------|
| `bgg_games_cache` | Cache des jeux BoardGameGeek |

**Colonnes clés :** `id`, `bgg_id`, `name`, `name_fr`, `image_url`, `crown_enabled` (activé pour La Couronne), `crown_modes` (modes de jeu compatibles).

---

## 2. Dashboard — Requêtes SQL

### Statistiques utilisateurs

```sql
-- Nombre total d'utilisateurs
SELECT count(*) AS total_users FROM profiles;

-- Inscriptions par mois
SELECT
  date_trunc('month', created_at) AS month,
  count(*) AS signups
FROM profiles
GROUP BY 1
ORDER BY 1 DESC;

-- Répartition par ville (top 20)
SELECT city, count(*) AS players
FROM profiles
WHERE city IS NOT NULL
GROUP BY city
ORDER BY players DESC
LIMIT 20;

-- Utilisateurs par rôle
SELECT role, count(*) FROM profiles GROUP BY role;
```

### Statistiques parties La Couronne

```sql
-- Total de parties par statut
SELECT status, count(*) AS total
FROM competitive_matches
GROUP BY status;

-- Parties complétées par mois
SELECT
  date_trunc('month', completed_at) AS month,
  count(*) AS matches
FROM competitive_matches
WHERE status = 'completed'
GROUP BY 1
ORDER BY 1 DESC;

-- Parties par ville (top 20)
SELECT
  c.name AS city,
  count(*) AS matches
FROM competitive_matches cm
JOIN cities c ON c.id = cm.city_id
WHERE cm.status = 'completed'
GROUP BY c.name
ORDER BY matches DESC
LIMIT 20;

-- Parties par jeu (top 20)
SELECT
  g.name AS game,
  count(*) AS matches
FROM competitive_matches cm
JOIN bgg_games_cache g ON g.id = cm.game_id
WHERE cm.status = 'completed'
GROUP BY g.name
ORDER BY matches DESC
LIMIT 20;

-- Parties par type (1v1, FFA, teams)
SELECT match_type, count(*)
FROM competitive_matches
WHERE status = 'completed'
GROUP BY match_type;

-- Matchs nuls
SELECT count(*) AS draws
FROM competitive_matches
WHERE status = 'completed' AND is_draw = true;

-- Joueurs actifs par ville (ayant terminé au moins 1 partie cette saison)
SELECT
  c.name AS city,
  count(DISTINCT cmp.user_id) AS active_players
FROM competitive_match_participants cmp
JOIN competitive_matches cm ON cm.id = cmp.match_id
JOIN cities c ON c.id = cm.city_id
WHERE cm.status = 'completed'
  AND cm.season_id = '<SEASON_ID>'
GROUP BY c.name
ORDER BY active_players DESC;
```

### Statistiques événements

```sql
-- Total d'événements
SELECT count(*) FROM events;

-- Événements par mois
SELECT
  date_trunc('month', starts_at) AS month,
  count(*) AS events
FROM events
GROUP BY 1
ORDER BY 1 DESC;

-- Événements par ville (top 20)
SELECT city, count(*) AS events
FROM events
WHERE city IS NOT NULL
GROUP BY city
ORDER BY events DESC
LIMIT 20;

-- Événements par jeu (top 20)
SELECT
  g.name AS game,
  count(*) AS events
FROM events e
JOIN bgg_games_cache g ON g.id = e.game_id
WHERE e.game_id IS NOT NULL
GROUP BY g.name
ORDER BY events DESC
LIMIT 20;

-- Taux de remplissage moyen
SELECT
  avg(max_players - spots_available)::numeric(10,1) AS avg_participants,
  avg(max_players)::numeric(10,1) AS avg_max
FROM events
WHERE max_players > 0;
```

### Saison courante

```sql
-- Obtenir la saison active
SELECT * FROM seasons WHERE status = 'active' LIMIT 1;
```

---

## 3. Gestion des contestations La Couronne

### Flow de confirmation des résultats

```
1. Créateur déclare les résultats
   → competitive_matches.results_declared_by = creator_id
   → competitive_matches.results_pending_confirmation = true
   → Participant déclarant : result_confirmed = true (auto)
   → Autres participants : result_confirmed = null (en attente)

2. Chaque participant vote
   → result_confirmed = true (confirme) ou false (conteste)

3a. Majorité stricte CONFIRME (floor(n/2) + 1)
   → PV calculés et appliqués
   → competitive_matches.status = 'completed'

3b. Majorité stricte CONTESTE
   → Placements et votes reset à null
   → results_pending_confirmation = false
   → Le créateur peut re-déclarer
```

### Requêtes utiles

```sql
-- Parties en attente de confirmation
SELECT
  cm.id,
  cm.join_code,
  cm.match_type,
  cm.created_at,
  cm.results_declared_by,
  g.name AS game,
  c.name AS city,
  (SELECT count(*) FROM competitive_match_participants p
   WHERE p.match_id = cm.id AND p.result_confirmed = true) AS confirmed,
  (SELECT count(*) FROM competitive_match_participants p
   WHERE p.match_id = cm.id AND p.result_confirmed = false) AS contested,
  (SELECT count(*) FROM competitive_match_participants p
   WHERE p.match_id = cm.id AND p.result_confirmed IS NULL) AS pending
FROM competitive_matches cm
LEFT JOIN bgg_games_cache g ON g.id = cm.game_id
LEFT JOIN cities c ON c.id = cm.city_id
WHERE cm.results_pending_confirmation = true
  AND cm.status = 'in_progress'
ORDER BY cm.created_at DESC;

-- Détail des votes d'une partie
SELECT
  p.id AS participant_id,
  pr.username,
  p.role,
  p.placement,
  p.result_confirmed,
  p.elo_before,
  p.elo_after,
  p.elo_change
FROM competitive_match_participants p
JOIN profiles pr ON pr.id = p.user_id
WHERE p.match_id = '<MATCH_ID>';

-- Parties bloquées (in_progress depuis + de 24h sans activité)
SELECT cm.*
FROM competitive_matches cm
WHERE cm.status = 'in_progress'
  AND cm.started_at < now() - interval '24 hours'
  AND cm.results_pending_confirmation = false
ORDER BY cm.started_at;
```

### Actions admin

#### Forcer la confirmation d'une partie

```sql
-- 1. Forcer tous les votes à "confirmé"
UPDATE competitive_match_participants
SET result_confirmed = true
WHERE match_id = '<MATCH_ID>';

-- 2. Après ça, le front-end détectera la majorité et appliquera les PV
-- OU appeler directement la RPC finalize_match_results (voir section 7)
```

#### Forcer le reset d'une contestation

```sql
-- Reset tous les votes et placements
UPDATE competitive_match_participants
SET placement = null, result_confirmed = null
WHERE match_id = '<MATCH_ID>';

UPDATE competitive_matches
SET results_declared_by = null,
    results_pending_confirmation = false
WHERE id = '<MATCH_ID>';
```

#### Annuler une partie

```sql
UPDATE competitive_matches
SET status = 'cancelled',
    cancelled_reason = 'Annulée par admin'
WHERE id = '<MATCH_ID>';
```

---

## 4. Gestion des PV (Points de Victoire)

### Où sont stockés les PV ?

| Donnée | Table | Colonnes |
|--------|-------|----------|
| PV par partie (historique) | `competitive_match_participants` | `elo_before`, `elo_after`, `elo_change` |
| PV courant par jeu | `player_city_game_elo` | `current_elo`, `peak_elo`, `wins`, `losses` |
| PV global par ville (cache) | `player_city_global_elo` | `global_elo`, `distinct_games`, `is_eligible_champion` |

### Consulter l'historique PV d'un joueur

```sql
-- Historique complet d'un joueur (toutes parties terminées)
SELECT
  cm.completed_at,
  g.name AS game,
  c.name AS city,
  cm.match_type,
  p.placement,
  p.elo_before AS pv_before,
  p.elo_after AS pv_after,
  p.elo_change AS pv_change,
  cm.is_draw,
  cm.id AS match_id
FROM competitive_match_participants p
JOIN competitive_matches cm ON cm.id = p.match_id
LEFT JOIN bgg_games_cache g ON g.id = cm.game_id
LEFT JOIN cities c ON c.id = cm.city_id
WHERE p.user_id = '<USER_ID>'
  AND cm.status = 'completed'
ORDER BY cm.completed_at DESC;

-- PV actuel par jeu × ville
SELECT
  c.name AS city,
  g.name AS game,
  pce.current_elo AS pv,
  pce.peak_elo AS peak,
  pce.total_matches,
  pce.wins,
  pce.losses
FROM player_city_game_elo pce
JOIN cities c ON c.id = pce.city_id
JOIN bgg_games_cache g ON g.id = pce.game_id
WHERE pce.user_id = '<USER_ID>'
  AND pce.season_id = '<SEASON_ID>'
ORDER BY pce.current_elo DESC;

-- PV global par ville
SELECT
  c.name AS city,
  pcge.global_elo AS pv_global,
  pcge.distinct_games,
  pcge.total_matches,
  pcge.is_eligible_champion
FROM player_city_global_elo pcge
JOIN cities c ON c.id = pcge.city_id
WHERE pcge.user_id = '<USER_ID>'
  AND pcge.season_id = '<SEASON_ID>';
```

### Modifier manuellement le PV d'un joueur

> **Important :** Après toute modification manuelle de `player_city_game_elo`, il faut **toujours** recalculer le global avec la RPC `recalculate_global_elo`.

#### Ajouter du PV artificiellement

```sql
-- 1. Modifier le PV d'un joueur pour un jeu spécifique
UPDATE player_city_game_elo
SET current_elo = current_elo + 20,  -- Ajouter 20 PV
    peak_elo = GREATEST(peak_elo, current_elo + 20)
WHERE user_id = '<USER_ID>'
  AND city_id = '<CITY_ID>'
  AND season_id = '<SEASON_ID>'
  AND game_id = '<GAME_ID>';

-- 2. Recalculer le PV global
SELECT recalculate_global_elo('<USER_ID>', '<CITY_ID>', '<SEASON_ID>');
```

#### Retirer du PV

```sql
-- 1. Retirer du PV (floor à 0)
UPDATE player_city_game_elo
SET current_elo = GREATEST(0, current_elo - 15)
WHERE user_id = '<USER_ID>'
  AND city_id = '<CITY_ID>'
  AND season_id = '<SEASON_ID>'
  AND game_id = '<GAME_ID>';

-- 2. Recalculer le PV global
SELECT recalculate_global_elo('<USER_ID>', '<CITY_ID>', '<SEASON_ID>');
```

#### Annuler les effets PV d'une partie

Pour annuler complètement les PV d'une partie terminée :

```sql
-- 1. Récupérer les infos de la partie
SELECT p.user_id, p.elo_change, cm.game_id, cm.season_id
FROM competitive_match_participants p
JOIN competitive_matches cm ON cm.id = p.match_id
WHERE p.match_id = '<MATCH_ID>'
  AND cm.status = 'completed';

-- 2. Pour CHAQUE participant, inverser le changement de PV
-- (Répéter pour chaque user_id retourné par la requête ci-dessus)
UPDATE player_city_game_elo
SET current_elo = GREATEST(0, current_elo - <ELO_CHANGE>),
    total_matches = total_matches - 1,
    wins = wins - CASE WHEN <ELO_CHANGE> > 0 THEN 1 ELSE 0 END,
    losses = losses - CASE WHEN <ELO_CHANGE> < 0 THEN 1 ELSE 0 END
WHERE user_id = '<USER_ID>'
  AND city_id = '<CITY_ID>'  -- Ville du joueur
  AND season_id = '<SEASON_ID>'
  AND game_id = '<GAME_ID>';

-- 3. Recalculer le global pour chaque joueur affecté
SELECT recalculate_global_elo('<USER_ID>', '<CITY_ID>', '<SEASON_ID>');

-- 4. Optionnel : marquer la partie comme annulée
UPDATE competitive_matches
SET status = 'cancelled',
    cancelled_reason = 'PV annulés par admin'
WHERE id = '<MATCH_ID>';
```

> **Attention conquête :** Pour les gagnants, le PV a été distribué dans **plusieurs villes** (villes des perdants + ville du gagnant). Il faut inverser dans chaque ville. Consultez les logs de la partie ou comparez avec `player_city_game_elo` pour identifier les villes impactées.

#### Reset complet d'un joueur pour la saison

```sql
-- Utiliser la RPC dédiée
SELECT reset_player_season_pv('<USER_ID>', '<SEASON_ID>');
```

---

## 5. Formules de calcul PV

### Paramètres

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| K-factor | 32 | Constante ELO |
| Floor | 0 | Le PV ne peut pas descendre en dessous de 0 |
| Éligibilité champion | 3+ jeux distincts | Un joueur doit avoir joué à 3 jeux différents dans une ville |
| Seuil activation ville | 30 joueurs actifs | Sauf si `cities.force_active = true` |

### Calcul 1v1

```
Probabilité victoire = 1 / (1 + 10^((PV_adversaire - PV_joueur) / 400))
Gain gagnant = round(K * (1 - probabilité_victoire_gagnant))
Perte perdant = round(K * (0 - probabilité_victoire_perdant))
```

### Calcul FFA (free-for-all)

Chaque joueur est comparé à chaque autre via la formule ELO. Le changement est la moyenne des comparaisons par paire.

### Calcul par équipes

Identique au FFA mais basé sur la moyenne de PV de l'équipe. Tous les membres d'une équipe reçoivent le même changement.

### Ajustements (sur les gains uniquement)

| Ajustement | Effet | Condition |
|------------|-------|-----------|
| Arbitre | +10% sur le gain | `has_referee = true` et pas de dépassement de limite (2 parties/7j avec le même arbitre) |
| Répétition adversaire | -10% par occurrence | Nombre de rencontres avec le même adversaire sur 7 jours glissants |

### Mécanique de conquête

Quand un joueur gagne :
1. Les **perdants** perdent du PV dans **leur propre ville**
2. Le **gagnant** gagne du PV distribué entre : les villes des perdants + sa propre ville
3. Distribution = `floor(gain_total / nombre_de_villes)`, le reste va à la propre ville du gagnant

### Match nul

- 0 PV pour tout le monde
- `total_matches` incrémenté mais pas `wins`/`losses`
- `is_draw = true` sur la partie

---

## 6. Tables et outils utiles

### cities — Gestion des villes

```sql
-- Lister toutes les villes avec nombre de joueurs actifs
SELECT
  c.id, c.name, c.force_active,
  count(DISTINCT pcge.user_id) AS eligible_players
FROM cities c
LEFT JOIN player_city_global_elo pcge
  ON pcge.city_id = c.id AND pcge.is_eligible_champion = true
GROUP BY c.id
ORDER BY eligible_players DESC;

-- Forcer l'activation d'une ville (bypass du seuil de 30 joueurs)
UPDATE cities SET force_active = true WHERE id = '<CITY_ID>';

-- Désactiver le forçage
UPDATE cities SET force_active = false WHERE id = '<CITY_ID>';
```

### seasons — Gestion des saisons

```sql
-- Saisons existantes
SELECT * FROM seasons ORDER BY season_number DESC;

-- Créer une nouvelle saison
INSERT INTO seasons (season_number, starts_at, ends_at, status)
VALUES (2, '2026-04-01', '2026-09-30', 'upcoming');

-- Activer une saison (désactiver l'ancienne d'abord)
UPDATE seasons SET status = 'completed' WHERE status = 'active';
UPDATE seasons SET status = 'active' WHERE id = '<NEW_SEASON_ID>';
```

### territories — Champions par ville

```sql
-- Champions actuels par ville
SELECT
  c.name AS city,
  pr.username AS champion,
  t.champion_elo,
  t.conquered_at
FROM territories t
JOIN cities c ON c.id = t.city_id
LEFT JOIN profiles pr ON pr.id = t.global_champion_id
WHERE t.season_id = '<SEASON_ID>'
  AND t.global_champion_id IS NOT NULL
ORDER BY t.champion_elo DESC;

-- Forcer un champion manuellement
UPDATE territories
SET global_champion_id = '<USER_ID>',
    champion_elo = <PV>,
    conquered_at = now()
WHERE city_id = '<CITY_ID>' AND season_id = '<SEASON_ID>';
```

### user_badges — Succès

```sql
-- Succès d'un joueur
SELECT
  ub.badge_type,
  c.name AS city,
  g.name AS game,
  s.season_number,
  ub.earned_at
FROM user_badges ub
LEFT JOIN cities c ON c.id = ub.city_id
LEFT JOIN bgg_games_cache g ON g.id = ub.game_id
LEFT JOIN seasons s ON s.id = ub.season_id
WHERE ub.user_id = '<USER_ID>'
ORDER BY ub.earned_at DESC;

-- Types de badges : champion, vice_champion, bronze, game_champion, emperor, conqueror, defender
```

### profiles.role — Rôles utilisateurs

```sql
-- Promouvoir un utilisateur en admin
UPDATE profiles SET role = 'admin' WHERE id = '<USER_ID>';

-- Rétrograder en utilisateur standard
UPDATE profiles SET role = 'user' WHERE id = '<USER_ID>';

-- Liste des admins
SELECT id, username, role FROM profiles WHERE role = 'admin';
```

---

## 7. RPC disponibles

Ces fonctions sont exécutables via `supabase.rpc()` ou directement en SQL. Elles utilisent `SECURITY DEFINER` (bypass RLS).

### `finalize_match_results(p_match_id, p_participant_results)`

Finalise une partie : met à jour les `elo_before`/`elo_after`/`elo_change` de chaque participant et passe la partie en `completed`.

```sql
SELECT finalize_match_results(
  '<MATCH_ID>',
  '[
    {"participant_id": "<P1_ID>", "elo_before": 100, "elo_after": 120, "elo_change": 20},
    {"participant_id": "<P2_ID>", "elo_before": 80, "elo_after": 64, "elo_change": -16}
  ]'::jsonb
);
```

### `recalculate_global_elo(p_user_id, p_city_id, p_season_id)`

Recalcule le PV global d'un joueur dans une ville (somme des `current_elo` de tous les jeux). Met à jour `player_city_global_elo`.

```sql
SELECT recalculate_global_elo('<USER_ID>', '<CITY_ID>', '<SEASON_ID>');
```

### `reset_player_season_pv(p_user_id, p_season_id)`

Reset complet du PV d'un joueur pour une saison (toutes villes, tous jeux).

```sql
SELECT reset_player_season_pv('<USER_ID>', '<SEASON_ID>');
```

### `delete_user()`

Supprime le compte de l'utilisateur authentifié (cascade sur toutes les tables liées).

### `get_unread_counts(p_user_id)`

Retourne `{ unread_messages, pending_friend_requests }` pour les notifications.

---

## Annexe : Trouver les IDs

```sql
-- Trouver un utilisateur par pseudo
SELECT id, username, city, role FROM profiles WHERE username ILIKE '%pseudo%';

-- Trouver une ville par nom
SELECT id, name, force_active FROM cities WHERE name ILIKE '%paris%';

-- Trouver un jeu par nom
SELECT id, name, crown_enabled FROM bgg_games_cache WHERE name ILIKE '%catan%';

-- Trouver la saison active
SELECT id, season_number FROM seasons WHERE status = 'active';

-- Trouver une partie par code
SELECT * FROM competitive_matches WHERE join_code = 'ABC123';
```
