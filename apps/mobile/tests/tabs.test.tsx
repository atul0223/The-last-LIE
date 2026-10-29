import React from 'react';
import { describe, it, expect } from 'vitest';
import renderer from 'react-test-renderer';

import HomeScreen from '../app/(tabs)/index';
import InvestigateScreen from '../app/(tabs)/investigate';
import ProgressScreen from '../app/(tabs)/progress';
import ChallengesScreen from '../app/(tabs)/challenges';
import ProfileScreen from '../app/(tabs)/profile';

describe('Tab Screens Render Tests', () => {
  it('renders HomeScreen with title and CTA', () => {
    const tree = renderer.create(<HomeScreen />).toJSON();
    expect(tree).toBeTruthy();
    const str = JSON.stringify(tree);
    expect(str).toContain('THE LAST LIE');
    expect(str).toContain('SOLVE A CASE');
    expect(str).toContain('DAILY INVESTIGATION');
  });

  it('renders InvestigateScreen with case archive and filters', () => {
    const tree = renderer.create(<InvestigateScreen />).toJSON();
    expect(tree).toBeTruthy();
    const str = JSON.stringify(tree);
    expect(str).toContain('CASE ARCHIVE');
    expect(str).toContain('The Missing Message');
    expect(str).toContain('CASE-0001');
  });

  it('renders ProgressScreen with rank and dossiers', () => {
    const tree = renderer.create(<ProgressScreen />).toJSON();
    expect(tree).toBeTruthy();
    const str = JSON.stringify(tree);
    expect(str).toContain('CAREER & DOSSIERS');
    expect(str).toContain('Senior Detective');
    expect(str).toContain('CHAR_MAYA');
  });

  it('renders ChallengesScreen with active duels', () => {
    const tree = renderer.create(<ChallengesScreen />).toJSON();
    expect(tree).toBeTruthy();
    const str = JSON.stringify(tree);
    expect(str).toContain('CHALLENGES');
    expect(str).toContain('+ CREATE NEW CHALLENGE');
    expect(str).toContain('HOW CHALLENGES WORK');
  });

  it('renders ProfileScreen with investigator dossier and settings', () => {
    const tree = renderer.create(<ProfileScreen />).toJSON();
    expect(tree).toBeTruthy();
    const str = JSON.stringify(tree);
    expect(str).toContain('INVESTIGATOR DOSSIER');
    expect(str).toContain('Agent Victor Vance');
    expect(str).toContain('BADGE #4409-NEON');
  });
});
