// Default teams. `lane` is fixed per vehicle so the board layout never changes.

export const VEHICLES = [
  { id: 'colectivo', nombre: 'Colectivo', color: '#E2412F', lane: 0 },
  { id: 'taxi', nombre: 'Taxi', color: '#F2B705', lane: 1 },
  { id: 'auto', nombre: 'Auto particular', color: '#2F6FD6', lane: 2 },
  { id: 'app', nombre: 'Plataforma', color: '#13A89E', lane: 3 },
  { id: 'moto', nombre: 'Moto', color: '#FF7A1A', lane: 4 },
  { id: 'remis', nombre: 'Remis', color: '#8E5BD6', lane: 5 },
];

export function defaultRoster() {
  return VEHICLES.map((v) => ({ ...v, enabled: true }));
}
