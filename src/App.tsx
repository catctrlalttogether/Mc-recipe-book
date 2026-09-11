import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Recipe } from './types';
import { recipesData, categories } from './data/recipes';
import { CraftingGrid } from './components/CraftingGrid';
import { RecipeCard } from './components/RecipeCard';
import { MinecraftBackground } from './components/MinecraftBackground';
import { ToastContainer, showToast } from './components/ToastSystem';
import { sound } from './utils/audio';
import {
  Search,
  Dices,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Sparkles,
  Compass,
  Boxes,
  Zap,
} from 'lucide-react';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'az' | 'za' | 'yield'>('az');
  
  // Pagination state to prevent rendering 1500+ items at once
  const [visibleCount, setVisibleCount] = useState(40);
  
  // Currently selected recipe for the 3x3 Hero Workstation
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>(() => {
    // Default to Mace or Crafter or Crafting Table
    const defaultItem = recipesData.find((r) => r.output.item === 'mace') ||
      recipesData.find((r) => r.output.item === 'crafter') ||
      recipesData[0];
    return defaultItem;
  });

  const [currentVariantIndex, setCurrentVariantIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const workstationRef = useRef<HTMLDivElement>(null);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crafting_table_favorites');
      return saved ? JSON.parse(saved) : ['mace', 'crafter', 'crafting_table', 'diamond_sword'];
    } catch {
      return ['mace', 'crafter', 'crafting_table', 'diamond_sword'];
    }
  });

  // Toggle favorite recipe
  const toggleFavorite = (recipeId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId];
      try {
        localStorage.setItem('crafting_table_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        sound.playWoodClick();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute all variants for the currently selected output item
  const allRecipeVariants = useMemo(() => {
    if (!selectedRecipe) return [];
    return recipesData.filter((r) => r.output.item === selectedRecipe.output.item);
  }, [selectedRecipe]);

  // Handle recipe selection & scroll to workstation
  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentVariantIndex(0);
    workstationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Ingredient click navigation inside workstation
  const handleSelectIngredient = (materialId: string) => {
    const cleanId = materialId.replace(/^minecraft:/, '').toLowerCase();
    const matchingRecipe = recipesData.find(
      (r) => r.output.item === cleanId || r.output.item === materialId || r.id === cleanId
    );
    if (matchingRecipe) {
      handleSelectRecipe(matchingRecipe);
      showToast({
        title: 'Ingredient Selected',
        description: `Now viewing recipe for ${matchingRecipe.name}`,
        itemId: matchingRecipe.output.item,
        type: 'info',
      });
    } else {
      showToast({
        title: 'Raw Material',
        description: `${cleanId.replace(/_/g, ' ')} is a mined/found material`,
        type: 'info',
      });
    }
  };

  // Filtered & Sorted Recipes
  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return recipesData
      .filter((recipe) => {
        // Version filter
        if (selectedVersion !== 'all') {
          if (selectedVersion === '1.21' && !recipe.version.includes('1.21') && !recipe.version.includes('26.2')) {
            return false;
          }
          if (selectedVersion === '1.20' && !recipe.version.includes('1.20')) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'all' && recipe.category !== selectedCategory) {
          return false;
        }

        // Favorites filter
        if (showOnlyFavorites && !favorites.includes(recipe.id) && !favorites.includes(recipe.output.item)) {
          return false;
        }

        // Search Query filter
        if (query) {
          const nameMatch = recipe.name.toLowerCase().includes(query);
          const itemMatch = recipe.output.item.toLowerCase().includes(query);
          const catMatch = recipe.category.toLowerCase().includes(query);
          const ingredientMatch = recipe.grid.some(
            (mat) => mat && mat.toLowerCase().includes(query)
          );

          if (!nameMatch && !itemMatch && !catMatch && !ingredientMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'az') return a.name.localeCompare(b.name);
        if (sortBy === 'za') return b.name.localeCompare(a.name);
        if (sortBy === 'yield') return b.output.count - a.output.count;
        return 0;
      });
  }, [searchQuery, selectedCategory, selectedVersion, showOnlyFavorites, favorites, sortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(40);
  }, [searchQuery, selectedCategory, selectedVersion, showOnlyFavorites, sortBy]);

  // Visible Recipes
  const visibleRecipes = useMemo(() => {
    return filteredRecipes.slice(0, visibleCount);
  }, [filteredRecipes, visibleCount]);

  // Random Recipe Discovery
  const handleRandomRecipe = () => {
    sound.playPop();
    const randIdx = Math.floor(Math.random() * recipesData.length);
    const rand = recipesData[randIdx];
    handleSelectRecipe(rand);
    showToast({
      title: 'Random Recipe Loaded',
      description: rand.name,
      itemId: rand.output.item,
      type: 'info',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1210] text-[#A8A8A8] selection:bg-[#55C64B]/30 selection:text-[#FFFFFF] relative pb-16">
      {/* Authentic Advancement Toast Notifications */}
      <ToastContainer />

      {/* Minecraft Rough Stone & Bedrock Pixel Texture Background */}
      <MinecraftBackground />

      {/* ================= HERO HEADER ================= */}
      <header className="relative z-10 pt-8 pb-6 px-4 sm:px-8 border-b-2 border-[#2b352e] bg-[#141916]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Main Title Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1e2620] border border-[#55C64B]/40 rounded-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#55C64B]" />
            <span className="font-pixel text-[11px] text-[#55C64B] tracking-wider uppercase font-bold">
              Minecraft 1.20+ & 1.21.4 / 26.2 Recipe Database
            </span>
          </div>

          <h1 className="font-pixel font-bold text-3xl sm:text-5xl text-[#FFFFFF] drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] tracking-tight">
            MINECRAFT CRAFTING TABLE
          </h1>
          <p className="text-xs sm:text-sm text-[#A8A8A8] mt-2 max-w-xl">
            Search 1,500+ recipes and instantly preview 3×3 crafting grid patterns, ingredients, and <code className="text-[#55C64B]">/give</code> commands.
          </p>

          {/* Quick Metrics Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-pixel">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#19201b] border border-[#353e37] rounded-xs text-[#FFFFFF]">
              <Boxes className="w-3.5 h-3.5 text-[#55C64B]" />
              <span>1,557 Recipes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#19201b] border border-[#353e37] rounded-xs text-[#FFFFFF]">
              <Compass className="w-3.5 h-3.5 text-[#55C64B]" />
              <span>1.20 – 1.21.4 / 26.2</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#19201b] border border-[#353e37] rounded-xs text-[#FFFFFF]">
              <Zap className="w-3.5 h-3.5 text-[#55C64B]" />
              <span>Instant 3×3 Workstation</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================= HERO 3x3 CRAFTING WORKSTATION ================= */}
      <section ref={workstationRef} className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-8 pb-4">
        <div className="mc-rough-panel border-2 border-[#353e37] p-4 sm:p-6 rounded-xs shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#353e37] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#55C64B] rounded-xs animate-pulse" />
              <h2 className="font-pixel font-bold text-base sm:text-xl text-[#FFFFFF]">
                3×3 CRAFTING WORKSTATION
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRandomRecipe}
              className="btn-3d-secondary px-3 py-1.5 rounded-xs text-xs font-pixel text-[#FFFFFF] flex items-center gap-1.5 cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-[#55C64B]" />
              <span>Random Item</span>
            </button>
          </div>

          {/* Interactive 3x3 Crafting Table Component */}
          {selectedRecipe && (
            <CraftingGrid
              recipe={allRecipeVariants[currentVariantIndex] || selectedRecipe}
              allRecipeVariants={allRecipeVariants}
              currentVariantIndex={currentVariantIndex}
              onSelectVariant={(idx) => setCurrentVariantIndex(idx)}
              onSelectIngredient={handleSelectIngredient}
            />
          )}
        </div>
      </section>

      {/* ================= SEARCH & CATALOG SECTION ================= */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-6 flex-1 space-y-6">
        {/* Search & Toolbar Controls */}
        <div className="mc-rough-panel border-2 border-[#353e37] p-4 sm:p-6 rounded-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A8]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items, ingredients, or commands (press '/' to focus)..."
                className="w-full pl-10 pr-10 py-3 bg-[#141815] border-2 border-[#353e37] focus:border-[#55C64B] focus:outline-none rounded-xs text-xs sm:text-sm text-[#FFFFFF] placeholder-[#626e65]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A8A8] hover:text-[#FFFFFF]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Version Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-pixel text-xs text-[#A8A8A8]">Version:</span>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="bg-[#141815] border-2 border-[#353e37] text-xs text-[#FFFFFF] rounded-xs px-3 py-2.5 focus:outline-none focus:border-[#55C64B] font-pixel"
              >
                <option value="all">All Versions</option>
                <option value="1.21">1.21 / 26.2 (Tricky Trials)</option>
                <option value="1.20">1.20 (Trails & Tales)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#55C64B]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'az' | 'za' | 'yield')}
                className="bg-[#141815] border-2 border-[#353e37] text-xs text-[#FFFFFF] rounded-xs px-3 py-2.5 focus:outline-none focus:border-[#55C64B] font-pixel"
              >
                <option value="az">Sort: A to Z</option>
                <option value="za">Sort: Z to A</option>
                <option value="yield">Sort: Yield Count</option>
              </select>
            </div>
          </div>

          {/* Category Chips & Favorites Toggle */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[#353e37]">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs max-w-full scrollbar-none">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sound.playWoodClick();
                      setSelectedCategory(cat.id);
                    }}
                    className={`px-3 py-1.5 rounded-xs font-pixel whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'btn-3d text-black font-bold'
                        : 'btn-3d-secondary text-[#A8A8A8] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Favorite Star Filter Button */}
            <button
              type="button"
              onClick={() => {
                sound.playPop();
                setShowOnlyFavorites(!showOnlyFavorites);
              }}
              className={`px-3 py-1.5 rounded-xs font-pixel text-xs flex items-center gap-1.5 cursor-pointer border transition-colors ${
                showOnlyFavorites
                  ? 'bg-[#55C64B] text-black border-[#7eed72] font-bold'
                  : 'bg-[#19201b] text-[#A8A8A8] hover:text-[#FFFFFF] border-[#353e37]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-current' : ''}`} />
              <span>Starred ({favorites.length})</span>
            </button>
          </div>
        </div>

        {/* Results Counter & Reset Controls */}
        <div className="flex items-center justify-between text-xs text-[#A8A8A8] px-1">
          <span>
            Showing <strong className="text-[#FFFFFF]">{filteredRecipes.length}</strong> craftable items
          </span>
          {(searchQuery || selectedCategory !== 'all' || selectedVersion !== 'all' || showOnlyFavorites) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedVersion('all');
                setShowOnlyFavorites(false);
              }}
              className="flex items-center gap-1.5 text-[#55C64B] hover:text-[#6FE35D] font-pixel cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>

        {/* Craftable Items Catalog Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="space-y-8 pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 pt-2">
              {visibleRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isSelected={selectedRecipe?.output.item === recipe.output.item}
                  isFavorite={favorites.includes(recipe.id) || favorites.includes(recipe.output.item)}
                  onSelect={handleSelectRecipe}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {visibleCount < filteredRecipes.length && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    sound.playWoodClick();
                    setVisibleCount(prev => prev + 40);
                  }}
                  className="btn-3d-secondary px-6 py-3 rounded-xs font-pixel text-xs text-[#FFFFFF] border-2 border-[#353e37] hover:border-[#55C64B] transition-colors"
                >
                  Load More Items ({filteredRecipes.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 text-center mc-rough-panel border-2 border-[#353e37] rounded-xs space-y-4">
            <Search className="w-10 h-10 text-[#6e7d72] mx-auto" />
            <h3 className="font-pixel font-bold text-lg text-[#FFFFFF]">
              No Craftable Items Found
            </h3>
            <p className="text-xs text-[#A8A8A8] max-w-sm mx-auto">
              Try modifying your search query, clearing version filters, or selecting a different item category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedVersion('all');
                setShowOnlyFavorites(false);
              }}
              className="btn-3d px-6 py-2.5 text-xs font-pixel rounded-xs text-black"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* ================= HERO PAGE FOOTER ================= */}
      <footer className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-12 pb-6 text-center text-xs text-[#6e7d72] border-t border-[#252e27] mt-16">
        <p className="font-pixel text-[#A8A8A8]">
          MINECRAFT CRAFTING TABLE WORKSTATION · VERSION 1.20 - 1.21.4 / 26.2
        </p>
        <p className="text-[11px] mt-1">
          Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
        </p>
      </footer>
    </div>
  );
}
