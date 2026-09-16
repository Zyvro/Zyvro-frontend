# Doctrine sans useEffect

## État de la conversion : **119 → 26 effets**

### 🚫 `useEffect` est BANNI du client

État de la conversion : **119 → 26 effets** (`HoleZone-client`). Doctrine complète et table de correspondance : `HoleZone-client/DOCTRINE-SANS-USEEFFECT.md`.

### ✅ Autorisé

1. **État serveur → `@tanstack/react-query` v5**  
   Socle : `src/app/queryClient.ts` (instance de MODULE — un `new QueryClient()` dans un composant serait recréé à chaque rendu et viderait le cache en silence) + `qk`, les clés centralisées. `<QueryClientProvider>` est dans `AppRoot`, au-dessus des autres providers et à l'INTÉRIEUR de l'`<ErrorBoundary>` racine. Coût mesuré : **+72 kB / +17 kB gzip** sur le bundle.

2. **Impératif attaché à un nœud → `ref` avec fonction de nettoyage** (React 19.2)  
   C'est ce qui remplace les effets de montage three.js (matériaux, écouteurs, observers).

3. **Abonnement (clavier, `matchMedia`, socket, horloge) → `useSyncExternalStore`**  
   Voir `src/shared/time/useNow.ts` : un seul `setInterval` PAR CADENCE, partagé.

4. **État dérivé → calcul pendant le rendu**  
   Réaction à une action → gestionnaire d'événement.

### ⛔ INTERDIT — le faux nœud déclencheur

`<span style={{display:"none"}} ref={onMount} />`.  
C'est `useEffect` réimplémenté avec du DOM fabriqué (même sémantique, plus des nœuds parasites). Produit deux fois pendant le chantier, rejeté deux fois. Un `ref` ne se pose que sur un nœud RÉELLEMENT rendu.

### ⚠️ `getSnapshot` DOIT être mis en cache

`() => Date.now()` renvoie une valeur neuve à chaque appel → React re-rend en boucle.  
Défaut introduit puis corrigé dans `useNow.ts` ; il était **intermittent** (deux appels dans la même milliseconde rompent la boucle par hasard), donc du genre qu'on ne reproduit pas à la demande.
