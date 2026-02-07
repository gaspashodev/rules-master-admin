# 🔐 Documentation Système de Rôles - Rules Master

**Version** : 2.0
**Date** : Février 2026
**Équipes concernées** : Back-office, Mobile, Web, Backend

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Migration depuis `is_admin`](#migration-depuis-is_admin)
3. [Structure de la base de données](#structure-de-la-base-de-données)
4. [Fonctions SQL disponibles](#fonctions-sql-disponibles)
5. [Utilisation côté client](#utilisation-côté-client)
6. [Permissions et accès](#permissions-et-accès)
7. [Gestion des rôles](#gestion-des-rôles)
8. [Exemples d'implémentation](#exemples-dimplémentation)
9. [FAQ](#faq)

---

## 🎯 Vue d'ensemble

### Ancien système (v1)
```sql
profiles.is_admin: boolean  -- true/false
```

### Nouveau système (v2) ✨
```sql
profiles.role: user_role    -- 'user' | 'moderator' | 'admin'
```

### Pourquoi cette migration ?

| Avantage | Description |
|----------|-------------|
| **Scalabilité** | Ajout facile de nouveaux rôles (editor, vip, etc.) |
| **Clarté** | Un seul champ au lieu de multiples `is_xxx` |
| **Hiérarchie** | Rôles hiérarchiques : admin > moderator > user |
| **Performance** | Index optimisé sur la colonne `role` |
| **Standard** | Pattern standard dans les systèmes d'auth |

---

## 🔄 Migration depuis `is_admin`

### État de la migration

✅ **Colonne `role` ajoutée**
✅ **Données migrées** : `is_admin=true` → `role='admin'`
⚠️ **Colonne `is_admin` conservée temporairement** (compatibilité)
📅 **Suppression `is_admin` prévue** : après validation de toutes les équipes

### Script de migration

Voir fichier : [`roles-migration.sql`](roles-migration.sql)

```sql
-- Migration automatique effectuée
UPDATE profiles SET role = 'admin' WHERE is_admin = true;
```

---

## 🗄️ Structure de la base de données

### Enum `user_role`

```sql
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
```

| Valeur | Description | Accès back-office |
|--------|-------------|-------------------|
| `user` | Utilisateur standard | ❌ Non |
| `moderator` | Modérateur de contenu | ✅ Partiel |
| `admin` | Administrateur complet | ✅ Complet |

### Table `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',  -- ⬅️ NOUVEAU
  is_admin BOOLEAN DEFAULT false,  -- ⚠️ DEPRECATED (à supprimer)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Index pour performance
CREATE INDEX idx_profiles_role ON profiles(role)
WHERE role IN ('moderator', 'admin');
```

---

## ⚙️ Fonctions SQL disponibles

### 1. `has_role(required_role)` - Vérifier un rôle spécifique

```sql
SELECT has_role('admin');  -- true si l'utilisateur est admin
SELECT has_role('moderator');  -- true si l'utilisateur est modérateur
```

**Utilisation dans RLS Policy** :
```sql
CREATE POLICY "Moderators can delete sessions"
ON sessions FOR DELETE
USING (has_role('moderator') OR has_role('admin'));
```

---

### 2. `is_admin()` - Vérifier si admin

```sql
SELECT is_admin();  -- true si role = 'admin'
```

**Utilisation dans RLS Policy** :
```sql
CREATE POLICY "Only admins can update site config"
ON site_config FOR UPDATE
USING (is_admin());
```

---

### 3. `is_moderator()` - Vérifier si modérateur

```sql
SELECT is_moderator();  -- true si role = 'moderator'
```

---

### 4. `is_admin_or_moderator()` - Accès back-office

```sql
SELECT is_admin_or_moderator();  -- true si role IN ('admin', 'moderator')
```

**⚠️ IMPORTANT pour le BACK-OFFICE** :

Cette fonction détermine l'accès au back-office :

```sql
-- Policy pour protéger les données sensibles
CREATE POLICY "Only staff can view analytics"
ON analytics FOR SELECT
USING (is_admin_or_moderator());
```

---

### 5. `get_my_role()` - Obtenir son rôle

```sql
SELECT get_my_role();  -- Retourne: 'user' | 'moderator' | 'admin'
```

---

## 💻 Utilisation côté client

### Web (TypeScript/React)

#### 1. Mise à jour des types

```typescript
// src/types/index.ts
export type UserRole = 'user' | 'moderator' | 'admin';

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: UserRole;  // ⬅️ NOUVEAU (remplace is_admin)
  created_at: string;
  updated_at: string;
}
```

#### 2. Hook d'authentification

```typescript
// src/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;  // ⬅️ Exposer le rôle directement
  isAdmin: boolean;
  isModerator: boolean;
  canAccessBackoffice: boolean;  // admin OU moderator
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const role = profile?.role || 'user';
  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const canAccessBackoffice = isAdmin || isModerator;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      isAdmin,
      isModerator,
      canAccessBackoffice
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 3. Utilisation dans les composants

```typescript
// Affichage conditionnel
function Navbar() {
  const { isAdmin, isModerator, canAccessBackoffice } = useAuth();

  return (
    <nav>
      {canAccessBackoffice && (
        <Link to="/backoffice">Back-office</Link>
      )}
      {isAdmin && (
        <Link to="/backoffice/settings">Paramètres globaux</Link>
      )}
      {isModerator && (
        <Link to="/backoffice/moderation">Modération</Link>
      )}
    </nav>
  );
}
```

#### 4. Routes protégées

```typescript
// ProtectedRoute avec rôle requis
function ProtectedRoute({
  children,
  requiredRole
}: {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[]
}) {
  const { role, user } = useAuth();

  if (!user) return <Navigate to="/connexion" />;

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
}

// Utilisation
<Route path="/backoffice" element={
  <ProtectedRoute requiredRole={['admin', 'moderator']}>
    <BackofficePage />
  </ProtectedRoute>
} />
```

---

### Mobile (React Native / Flutter)

#### React Native / Expo

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const role = profile?.role || 'user';
  const canAccessBackoffice = ['admin', 'moderator'].includes(role);

  return {
    profile,
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    canAccessBackoffice,
  };
}

// Composants
function SettingsScreen() {
  const { canAccessBackoffice } = useAuth();

  return (
    <View>
      {canAccessBackoffice && (
        <Button
          title="Ouvrir le back-office"
          onPress={() => navigation.navigate('Backoffice')}
        />
      )}
    </View>
  );
}
```

#### Flutter

```dart
// models/profile.dart
enum UserRole { user, moderator, admin }

class Profile {
  final String id;
  final String? username;
  final UserRole role;

  bool get isAdmin => role == UserRole.admin;
  bool get isModerator => role == UserRole.moderator;
  bool get canAccessBackoffice => isAdmin || isModerator;
}

// Utilisation
if (profile.canAccessBackoffice) {
  // Afficher menu back-office
}
```

---

### Back-office (Très important 🚨)

#### Vérification de l'accès

**⚠️ CRITIQUE** : Le back-office DOIT vérifier le rôle pour autoriser l'accès.

```typescript
// app/backoffice/layout.tsx (Next.js)
export default async function BackofficeLayout({ children }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // BLOQUER si pas admin ou moderator
  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/');
  }

  return <BackofficeShell>{children}</BackofficeShell>;
}
```

#### Permissions granulaires

```typescript
// Permissions spécifiques par rôle
const BACKOFFICE_PERMISSIONS = {
  admin: {
    users: ['read', 'write', 'delete'],
    settings: ['read', 'write'],
    analytics: ['read'],
    roles: ['read', 'write'],  // Peut définir d'autres admins
  },
  moderator: {
    users: ['read', 'delete'],  // Peut bannir
    sessions: ['read', 'delete'],  // Peut supprimer sessions inappropriées
    analytics: ['read'],
    roles: [],  // Ne peut PAS modifier les rôles
  },
};

function canPerform(role: UserRole, resource: string, action: string) {
  return BACKOFFICE_PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}

// Utilisation
if (canPerform(role, 'users', 'delete')) {
  // Afficher bouton bannir utilisateur
}
```

---

## 🔒 Permissions et accès

### Matrice des permissions

| Ressource | User | Moderator | Admin |
|-----------|------|-----------|-------|
| **Back-office** | ❌ | ✅ Partiel | ✅ Complet |
| **Voir analytics** | ❌ | ✅ | ✅ |
| **Supprimer sessions** | Ses sessions | Toutes | Toutes |
| **Bannir utilisateurs** | ❌ | ✅ | ✅ |
| **Modifier config globale** | ❌ | ❌ | ✅ |
| **Définir rôles** | ❌ | ❌ | ✅ |
| **Supprimer photos** | Ses photos | Toutes | Toutes |

### Exemples de RLS Policies

```sql
-- Seuls admin et moderator peuvent supprimer n'importe quelle session
CREATE POLICY "Staff can delete any session"
ON sessions FOR DELETE
USING (
  auth.uid() = organiser_id  -- Organisateur
  OR is_admin_or_moderator()  -- OU staff
);

-- Seuls les admins peuvent modifier les rôles
CREATE POLICY "Only admins can update roles"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (
  -- Si on modifie le rôle, on doit être admin
  (OLD.role IS DISTINCT FROM NEW.role AND is_admin())
  OR OLD.role IS NOT DISTINCT FROM NEW.role
);

-- Admins et modérateurs peuvent voir les signalements
CREATE POLICY "Staff can view reports"
ON reports FOR SELECT
USING (is_admin_or_moderator());
```

---

## 👥 Gestion des rôles

### Définir un rôle (Admin uniquement)

```sql
-- Promouvoir en admin
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Promouvoir en modérateur
UPDATE profiles
SET role = 'moderator'
WHERE id = (SELECT id FROM auth.users WHERE email = 'moderator@example.com');

-- Révoquer les privilèges (remettre user)
UPDATE profiles
SET role = 'user'
WHERE id = 'user-uuid';
```

### Interface back-office (exemple)

```typescript
// BackofficeUsersPage.tsx
async function updateUserRole(userId: string, newRole: UserRole) {
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Vérification côté client (la RLS policy empêchera aussi)
  if (myProfile?.role !== 'admin') {
    toast.error('Seuls les admins peuvent modifier les rôles');
    return;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) {
    toast.error('Erreur lors de la mise à jour du rôle');
  } else {
    toast.success(`Rôle mis à jour : ${newRole}`);
  }
}
```

---

## 💡 Exemples d'implémentation

### Exemple 1 : Vérifier le rôle au chargement

```typescript
// App.tsx
function App() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (user && profile) {
      console.log('User role:', profile.role);

      // Rediriger les staff vers le back-office si URL=/backoffice
      if (window.location.pathname === '/backoffice'
          && !['admin', 'moderator'].includes(profile.role)) {
        window.location.href = '/';
      }
    }
  }, [user, profile]);

  return <RouterProvider router={router} />;
}
```

### Exemple 2 : API endpoint protégé

```typescript
// app/api/admin/users/route.ts (Next.js)
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Continuer avec la logique admin
  const users = await supabase.from('profiles').select('*');
  return Response.json(users);
}
```

### Exemple 3 : Bouton conditionnel

```typescript
function SessionCard({ session }) {
  const { role } = useAuth();
  const canDelete =
    session.organiser_id === user.id ||
    ['admin', 'moderator'].includes(role);

  return (
    <Card>
      <h2>{session.title}</h2>
      {canDelete && (
        <Button onClick={() => deleteSession(session.id)}>
          Supprimer
        </Button>
      )}
    </Card>
  );
}
```

---

## ❓ FAQ

### Q1 : Que se passe-t-il avec les utilisateurs `is_admin=true` existants ?

**R** : Ils ont été automatiquement migrés vers `role='admin'` par le script SQL. La colonne `is_admin` est conservée temporairement pour compatibilité.

---

### Q2 : Quand supprimer la colonne `is_admin` ?

**R** : Une fois que **toutes les équipes** (Web, Mobile, Back-office) ont migré leur code pour utiliser `role` au lieu de `is_admin`. Vérifiez qu'aucune requête n'utilise plus `is_admin`.

```sql
-- Vérification avant suppression
-- Rechercher dans votre code : "is_admin" (grep)

-- Quand tout est OK :
ALTER TABLE profiles DROP COLUMN is_admin;
```

---

### Q3 : Comment vérifier mon rôle en SQL ?

```sql
-- Méthode 1 : Fonction
SELECT get_my_role();

-- Méthode 2 : Query directe
SELECT role FROM profiles WHERE id = auth.uid();
```

---

### Q4 : Puis-je avoir plusieurs rôles simultanément ?

**R** : Non, ce système utilise un seul rôle par utilisateur. Si vous avez besoin de permissions complexes, envisagez un système RBAC complet (hors scope MVP).

---

### Q5 : Comment tester localement avec différents rôles ?

```sql
-- Passer en admin temporairement
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();

-- Repasser en user
UPDATE profiles SET role = 'user' WHERE id = auth.uid();
```

Ou créer plusieurs comptes de test :
- `user@test.com` → role='user'
- `moderator@test.com` → role='moderator'
- `admin@test.com` → role='admin'

---

### Q6 : Le back-office mobile doit-il aussi vérifier le rôle ?

**R** : **OUI, absolument**. Même si les RLS policies protègent les données côté serveur, vous devez vérifier le rôle côté client pour :
1. Afficher/cacher les fonctionnalités appropriées
2. Éviter des erreurs utilisateur
3. Meilleure UX

```dart
// Flutter
if (profile.canAccessBackoffice) {
  Navigator.push(context, BackofficeRoute());
} else {
  showDialog('Accès refusé');
}
```

---

## 📞 Contact

**Questions ?** Contactez l'équipe technique :
- Web/Backend : [Votre nom]
- Documentation : Ce fichier + `roles-migration.sql`
- Support : [Slack/Discord/Email]

---

## 🔄 Changelog

| Version | Date | Changements |
|---------|------|-------------|
| **2.0** | Fév 2026 | Migration vers système `role` (enum) |
| 1.0 | Jan 2026 | Système initial `is_admin` (boolean) |

---

**⚠️ ACTION REQUISE** : Toutes les équipes doivent mettre à jour leur code pour utiliser `profile.role` au lieu de `profile.is_admin` avant la date limite de suppression de `is_admin`.
