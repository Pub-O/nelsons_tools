import { Tab } from '../types';

export type ModuleTier = 'core' | 'paid-addon';

export type PubOModule = {
  id: Tab;
  label: string;
  shortLabel: string;
  tier: ModuleTier;
  summary: string;
  nav: boolean;
};

export const moduleCatalog: PubOModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    tier: 'core',
    summary: 'Tagesüberblick, Kennzahlen und Schnellzugriff.',
    nav: true
  },
  {
    id: 'stock',
    label: 'Bestand',
    shortLabel: 'Stock',
    tier: 'core',
    summary: 'Produkte, Zielbestände und Zählstände verwalten.',
    nav: true
  },
  {
    id: 'shopping',
    label: 'Einkauf',
    shortLabel: 'Einkauf',
    tier: 'core',
    summary: 'Niedrige Bestände als Einkaufsliste abarbeiten.',
    nav: true
  },
  {
    id: 'checklists',
    label: 'Checklisten',
    shortLabel: 'Listen',
    tier: 'core',
    summary: 'Closing- und Routineaufgaben für den Betrieb.',
    nav: true
  },
  {
    id: 'easy-count',
    label: 'Easy Count',
    shortLabel: 'Easy',
    tier: 'paid-addon',
    summary: 'Schnelle Nachbonnage über Punktwerte und Kassastände.',
    nav: true
  },
  {
    id: 'shifts',
    label: 'Dienstplanung',
    shortLabel: 'Dienst',
    tier: 'paid-addon',
    summary: 'Dienste, Mitarbeiterprofile und Urlaube planen.',
    nav: true
  },
  {
    id: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    tier: 'core',
    summary: 'Standort, Zugang und Modulstatus verwalten.',
    nav: true
  }
];

export const navigationModules = moduleCatalog.filter((module) => module.nav);
export const coreModules = moduleCatalog.filter((module) => module.tier === 'core');
export const paidAddonModules = moduleCatalog.filter((module) => module.tier === 'paid-addon');

export function getModule(tab: Tab) {
  return moduleCatalog.find((module) => module.id === tab);
}

export function isPaidAddon(tab: Tab) {
  return getModule(tab)?.tier === 'paid-addon';
}
