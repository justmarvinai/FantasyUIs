/**
 * Captures reference screenshots of the running site into `screenshots/`.
 * Useful for eyeballing a change across both themes without clicking around.
 *
 *   npm run dev            # in one shell
 *   npm run shots          # in another
 *
 * Pass a port as the first argument if the dev server is not on 5173.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = process.argv[2] ?? '5173';
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(import.meta.dirname, '..', 'screenshots');

/** The sandbox ships Chromium at a fixed path; fall back to Playwright's own. */
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const SHOTS = [
  { name: 'index', url: '/', height: 1100 },
  { name: 'assets', url: '/assets.html', height: 1100 },
  { name: 'start', url: '/start.html', height: 1100 },
  { name: 'panel', url: '/components/Panel.html', height: 1500 },
  { name: 'hud', url: '/components/HUD.html', height: 1500 },
  { name: 'hud-dark', url: '/components/HUD.html', height: 1500, theme: 'dark-ember' },
  { name: 'inventory', url: '/components/InventoryGrid.html', height: 1400 },
  { name: 'dialogue', url: '/components/DialogueBox.html', height: 1400 },
  { name: 'shop-dark', url: '/components/ShopPanel.html', height: 1500, theme: 'dark-ember' },
  { name: 'mainmenu', url: '/components/MainMenu.html', height: 1500 },
  { name: 'champion-card', url: '/components/ChampionCard.html', height: 1500 },
  { name: 'summon', url: '/components/SummonResult.html', height: 1500 },
  { name: 'glyph', url: '/components/Glyph.html', height: 1300 },
  { name: 'team-slots', url: '/components/TeamSlots.html', height: 1300 },
  { name: 'turn-meter', url: '/components/TurnMeter.html', height: 1200 },
  { name: 'reward-track', url: '/components/RewardTrack.html', height: 1300 },
  { name: 'daily-rewards', url: '/components/DailyRewards.html', height: 1300 },
  { name: 'upgrade', url: '/components/UpgradePanel.html', height: 1500 },
  { name: 'stage-select', url: '/components/StageSelect.html', height: 1300 },
  { name: 'offer-dark', url: '/components/OfferCard.html', height: 1500, theme: 'dark-ember' },
  { name: 'bottom-nav', url: '/components/BottomNav.html', height: 1200 },
  { name: 'tier-badge', url: '/components/TierBadge.html', height: 1200 },
  { name: 'tint-frame', url: '/components/TintFrame.html', height: 1600 },
  { name: 'tint-frame-dark', url: '/components/TintFrame.html', height: 1600, theme: 'dark-ember' },
  { name: 'boss-bar', url: '/components/BossHealthBar.html', height: 1200 },
  { name: 'arena-matchup', url: '/components/ArenaMatchup.html', height: 1300 },
  { name: 'banner-carousel', url: '/components/BannerCarousel.html', height: 1400 },
  { name: 'mastery-grid', url: '/components/MasteryGrid.html', height: 1500 },
  { name: 'artifact-card', url: '/components/ArtifactCard.html', height: 1400 },
  { name: 'champion-list', url: '/components/ChampionList.html', height: 1400 },
  { name: 'top-bar', url: '/components/TopBar.html', height: 1200 },
  { name: 'reward-popup', url: '/components/RewardPopup.html', height: 1300 },
  { name: 'battle-log', url: '/components/BattleLog.html', height: 1300 },
  { name: 'chat-panel', url: '/components/ChatPanel.html', height: 1300 },
  { name: 'skill-card', url: '/components/SkillCard.html', height: 1300 },
  { name: 'world-map', url: '/components/WorldMap.html', height: 1300 },
  { name: 'formation', url: '/components/FormationGrid.html', height: 1200 },
  { name: 'socket-panel', url: '/components/SocketPanel.html', height: 1200 },
  { name: 'codex', url: '/components/CodexEntry.html', height: 1400 },
  { name: 'friend-list', url: '/components/FriendList.html', height: 1300 },
  { name: 'achievements', url: '/components/AchievementList.html', height: 1400 },
  { name: 'podium', url: '/components/LeaderboardPodium.html', height: 1300 },
  { name: 'side-nav', url: '/components/SideNav.html', height: 1300 },
  { name: 'health-pips', url: '/components/HealthPips.html', height: 1100 },
  { name: 'loot-roll', url: '/components/LootRoll.html', height: 1400 },
  { name: 'patch-notes', url: '/components/PatchNotes.html', height: 1300 },
];

async function main() {
  await mkdir(OUT, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });
  } catch {
    browser = await chromium.launch({ args: ['--no-sandbox'] });
  }

  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on('pageerror', (e) => console.error(`  [pageerror] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error(`  [console] ${m.text()}`);
  });

  for (const shot of SHOTS) {
    await page.setViewportSize({ width: 1400, height: shot.height ?? 1000 });
    await page.goto(BASE + shot.url, { waitUntil: 'networkidle', timeout: 60000 });
    if (shot.theme) {
      await page.click(`[data-theme-set="${shot.theme}"]`);
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${shot.name}.png`) });
    console.log(`✓ ${shot.name}.png`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
