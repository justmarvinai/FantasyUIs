/**
 * Captures reference screenshots of the running site into `screenshots/`.
 * Useful for eyeballing a change across both themes without clicking around.
 *
 *   npm run dev            # in one shell
 *   npm run shots          # in another
 *
 * Pass a port as the first argument if the dev server is not on 5173, and any
 * number of shot names after it to refresh only those:
 *
 *   node scripts/screenshot.mjs 5173 rune-circle signpost stat-block
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = process.argv[2] ?? '5173';
/** Optional allow-list, so a one-component change does not re-shoot the set. */
const ONLY = new Set(process.argv.slice(3));
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
  { name: 'scroll', url: '/components/Scroll.html', height: 1300 },
  { name: 'ornate-header', url: '/components/OrnateHeader.html', height: 1400 },
  { name: 'scene-backdrop', url: '/components/SceneBackdrop.html', height: 1400 },
  { name: 'checklist', url: '/components/CheckList.html', height: 1200 },
  { name: 'range-slider', url: '/components/RangeSlider.html', height: 1200 },
  { name: 'keybind', url: '/components/KeybindInput.html', height: 1200 },
  { name: 'sparkline', url: '/components/Sparkline.html', height: 1300 },
  { name: 'gauge', url: '/components/Gauge.html', height: 1200 },
  { name: 'gauge-dark', url: '/components/Gauge.html', height: 1200, theme: 'dark-ember' },
  { name: 'timeline', url: '/components/Timeline.html', height: 1400 },
  { name: 'trade-panel', url: '/components/TradePanel.html', height: 1400 },
  { name: 'quest-board', url: '/components/QuestBoard.html', height: 1500 },
  { name: 'compass', url: '/components/Compass.html', height: 1200 },
  { name: 'target-selector', url: '/components/TargetSelector.html', height: 1200 },
  { name: 'threat-meter', url: '/components/ThreatMeter.html', height: 1200 },
  { name: 'fusion-panel', url: '/components/FusionPanel.html', height: 1400 },
  { name: 'bond-meter', url: '/components/BondMeter.html', height: 1300 },
  { name: 'clan-roster', url: '/components/ClanRoster.html', height: 1400 },
  { name: 'player-profile', url: '/components/PlayerProfile.html', height: 1400 },
  { name: 'connection', url: '/components/ConnectionStatus.html', height: 1200 },
  { name: 'speech-bubble', url: '/components/SpeechBubble.html', height: 1200 },
  { name: 'title-gate', url: '/components/TitleGate.html', height: 1600 },
  { name: 'title-gate-dark', url: '/components/TitleGate.html', height: 1600, theme: 'dark-ember' },
  { name: 'story-slide', url: '/components/StorySlide.html', height: 1500 },
  { name: 'ribbon', url: '/components/Ribbon.html', height: 1200 },
  { name: 'scene-transition', url: '/components/SceneTransition.html', height: 1400 },
  { name: 'pagination', url: '/components/Pagination.html', height: 1100 },
  { name: 'reorder-list', url: '/components/ReorderList.html', height: 1300 },
  { name: 'dye-picker', url: '/components/DyePicker.html', height: 1300 },
  { name: 'share-bar', url: '/components/ShareBar.html', height: 1200 },
  { name: 'activity-calendar', url: '/components/ActivityCalendar.html', height: 1300 },
  { name: 'element-wheel', url: '/components/ElementWheel.html', height: 1400 },
  { name: 'element-wheel-dark', url: '/components/ElementWheel.html', height: 1400, theme: 'dark-ember' },
  { name: 'auction-house', url: '/components/AuctionHouse.html', height: 1400 },
  { name: 'crafting-queue', url: '/components/CraftingQueue.html', height: 1300 },
  { name: 'auto-battle-rules', url: '/components/AutoBattleRules.html', height: 1400 },
  { name: 'skill-check', url: '/components/SkillCheck.html', height: 1100 },
  { name: 'dungeon-map', url: '/components/DungeonMap.html', height: 1300 },
  { name: 'spin-wheel', url: '/components/SpinWheel.html', height: 1500 },
  { name: 'rate-table', url: '/components/RateTable.html', height: 1400 },
  { name: 'idle-rewards', url: '/components/IdleRewards.html', height: 1400 },
  { name: 'party-finder', url: '/components/PartyFinder.html', height: 1300 },
  { name: 'war-board', url: '/components/WarBoard.html', height: 1400 },
  { name: 'damage-vignette', url: '/components/DamageVignette.html', height: 1200 },
  { name: 'death-screen', url: '/components/DeathScreen.html', height: 1500 },
  { name: 'death-screen-dark', url: '/components/DeathScreen.html', height: 1500, theme: 'dark-ember' },
  { name: 'stage-trail', url: '/components/StageTrail.html', height: 1600 },
  { name: 'stage-trail-dark', url: '/components/StageTrail.html', height: 1600, theme: 'dark-ember' },
  { name: 'region-atlas', url: '/components/RegionAtlas.html', height: 1600 },
  { name: 'region-atlas-dark', url: '/components/RegionAtlas.html', height: 1600, theme: 'dark-ember' },

  // ── The 45-component batch: five per category ──
  { name: 'pedestal', url: '/components/Pedestal.html', height: 1400 },
  { name: 'rune-circle', url: '/components/RuneCircle.html', height: 1500 },
  { name: 'tabletop', url: '/components/Tabletop.html', height: 1300 },
  { name: 'signpost', url: '/components/Signpost.html', height: 1400 },
  { name: 'stained-glass', url: '/components/StainedGlass.html', height: 1400 },
  { name: 'dice-roller', url: '/components/DiceRoller.html', height: 1400 },
  { name: 'stat-allocator', url: '/components/StatAllocator.html', height: 1500 },
  { name: 'rune-pad', url: '/components/RunePad.html', height: 1300 },
  { name: 'time-dial', url: '/components/TimeDial.html', height: 1300 },
  { name: 'volume-mixer', url: '/components/VolumeMixer.html', height: 1500 },
  { name: 'stat-block', url: '/components/StatBlock.html', height: 1600 },
  { name: 'relationship-web', url: '/components/RelationshipWeb.html', height: 1400 },
  { name: 'tier-list', url: '/components/TierList.html', height: 1400 },
  { name: 'ledger', url: '/components/Ledger.html', height: 1400 },
  { name: 'resist-grid', url: '/components/ResistGrid.html', height: 1400 },
  { name: 'companion-panel', url: '/components/CompanionPanel.html', height: 1500 },
  { name: 'housing-grid', url: '/components/HousingGrid.html', height: 1500 },
  { name: 'loadout-slots', url: '/components/LoadoutSlots.html', height: 1400 },
  { name: 'haggle-panel', url: '/components/HagglePanel.html', height: 1400 },
  { name: 'event-calendar', url: '/components/EventCalendar.html', height: 1400 },
  { name: 'initiative-track', url: '/components/InitiativeTrack.html', height: 1300 },
  { name: 'battle-grid', url: '/components/BattleGrid.html', height: 1500 },
  { name: 'reticle', url: '/components/Reticle.html', height: 1300 },
  { name: 'kill-feed', url: '/components/KillFeed.html', height: 1200 },
  { name: 'phase-tracker', url: '/components/PhaseTracker.html', height: 1300 },
  { name: 'wish-list', url: '/components/WishList.html', height: 1500 },
  { name: 'exchange-shop', url: '/components/ExchangeShop.html', height: 1400 },
  { name: 'skin-selector', url: '/components/SkinSelector.html', height: 1600 },
  { name: 'synergy-panel', url: '/components/SynergyPanel.html', height: 1400 },
  { name: 'subscription-card', url: '/components/SubscriptionCard.html', height: 1600 },
  { name: 'guild-bank', url: '/components/GuildBank.html', height: 1600 },
  { name: 'request-list', url: '/components/RequestList.html', height: 1400 },
  { name: 'gift-panel', url: '/components/GiftPanel.html', height: 1400 },
  { name: 'clan-perks', url: '/components/ClanPerks.html', height: 1400 },
  { name: 'clan-finder', url: '/components/ClanFinder.html', height: 1500 },
  { name: 'objective-banner', url: '/components/ObjectiveBanner.html', height: 1300 },
  { name: 'impact-frame', url: '/components/ImpactFrame.html', height: 1300 },
  { name: 'nameplate', url: '/components/Nameplate.html', height: 1300 },
  { name: 'tutorial-mask', url: '/components/TutorialMask.html', height: 1300 },
  { name: 'countdown-overlay', url: '/components/CountdownOverlay.html', height: 1300 },
  { name: 'character-creator', url: '/components/CharacterCreator.html', height: 1600 },
  { name: 'inventory-screen', url: '/components/InventoryScreen.html', height: 1600 },
  { name: 'summon-screen', url: '/components/SummonScreen.html', height: 1600 },
  { name: 'credits-roll', url: '/components/CreditsRoll.html', height: 1400 },
  { name: 'season-end', url: '/components/SeasonEndScreen.html', height: 1600 },

  // A few of the new ones in the other theme, to prove the slots bind.
  { name: 'pedestal-dark', url: '/components/Pedestal.html', height: 1400, theme: 'dark-ember' },
  { name: 'stat-block-dark', url: '/components/StatBlock.html', height: 1600, theme: 'dark-ember' },
  { name: 'battle-grid-dark', url: '/components/BattleGrid.html', height: 1500, theme: 'dark-ember' },
  { name: 'character-creator-dark', url: '/components/CharacterCreator.html', height: 1600, theme: 'dark-ember' },
  { name: 'guild-bank-dark', url: '/components/GuildBank.html', height: 1600, theme: 'dark-ember' },
  { name: 'season-end-dark', url: '/components/SeasonEndScreen.html', height: 1600, theme: 'dark-ember' },

  // ── Buttons ──
  { name: 'icon-button', url: '/components/IconButton.html', height: 1100 },
  { name: 'ability-button', url: '/components/AbilityButton.html', height: 1200 },
  { name: 'hold-button', url: '/components/HoldButton.html', height: 1100 },
  { name: 'ribbon-button', url: '/components/RibbonButton.html', height: 1300 },
  { name: 'tint-button', url: '/components/TintButton.html', height: 1100 },
  { name: 'split-button', url: '/components/SplitButton.html', height: 1100 },
  { name: 'toggle-button', url: '/components/ToggleButton.html', height: 1100 },
  { name: 'cost-button', url: '/components/CostButton.html', height: 1100 },
  { name: 'gem-button', url: '/components/GemButton.html', height: 1300 },
  { name: 'keycap-button', url: '/components/KeycapButton.html', height: 1300 },
  { name: 'arrow-button', url: '/components/ArrowButton.html', height: 1100 },
  { name: 'menu-button', url: '/components/MenuButton.html', height: 1400 },
  { name: 'loading-button', url: '/components/LoadingButton.html', height: 1100 },
  { name: 'button-group', url: '/components/ButtonGroup.html', height: 1300 },

  // The same buttons in the other theme, to prove the slots bind.
  { name: 'icon-button-dark', url: '/components/IconButton.html', height: 1100, theme: 'dark-ember' },
  { name: 'ability-button-dark', url: '/components/AbilityButton.html', height: 1200, theme: 'dark-ember' },
  { name: 'ribbon-button-dark', url: '/components/RibbonButton.html', height: 1300, theme: 'dark-ember' },
  { name: 'cost-button-dark', url: '/components/CostButton.html', height: 1100, theme: 'dark-ember' },
  { name: 'toggle-button-dark', url: '/components/ToggleButton.html', height: 1100, theme: 'dark-ember' },
  { name: 'menu-button-dark', url: '/components/MenuButton.html', height: 1400, theme: 'dark-ember' },
  { name: 'gem-button-dark', url: '/components/GemButton.html', height: 1300, theme: 'dark-ember' },
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
    if (ONLY.size && !ONLY.has(shot.name)) continue;
    await page.setViewportSize({ width: 1400, height: shot.height ?? 1000 });
    await page.goto(BASE + shot.url, { waitUntil: 'networkidle', timeout: 60000 });
    // The site persists the chosen theme to localStorage, so a single dark shot
    // would silently darken every shot after it. Set it explicitly every time.
    await page.click(`[data-theme-set="${shot.theme ?? 'stone-vine'}"]`);
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
