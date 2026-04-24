// Entry point. Boots the Game singleton which owns the render loop and all
// scenes. Everything downstream hangs off this one import.
import { Game } from './core/game';

const game = new Game(document.getElementById('app')!);
game.start();

// Expose for debugging from the browser console — the Open Source judges
// will poke at this, and so will I.
(window as any).game = game;
