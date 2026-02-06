import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Brain,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Package,
  Clock,
  ShoppingCart,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Info,
  Store,
} from 'lucide-react';
import {
  inventoryApi,
  suggestionApi,
  orderApi,
  vendorApi,
  type ProductResponse,
  type AiSuggestionResponse,
  type VendorResponse,
} from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useToast } from '@/hooks/use-toast';

export default function AISuggestions() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [reorderDialog, setReorderDialog] = useState<AiSuggestionResponse | null>(null);
  const [detailDialog, setDetailDialog] = useState<AiSuggestionResponse | null>(null);
  const [reorderQty, setReorderQty] = useState(0);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [approvedVendors, setApprovedVendors] = useState<VendorResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { on } = useSocket();

  // ── Fetch data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, sugRes, vendorRes] = await Promise.all([
        inventoryApi.getProducts(),
        suggestionApi.list(),
        vendorApi.getVendors('APPROVED'),
      ]);
      setProducts(prodRes.products);
      setSuggestions(sugRes.suggestions);
      setApprovedVendors(vendorRes.vendors);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time socket events ─────────────────────────────────
  useEffect(() => {
    const unsub = on('ai:suggestion-created', () => { fetchData(); });
    return unsub;
  }, [on, fetchData]);

  useEffect(() => {
    const unsub = on('order:approved', () => { fetchData(); });
    return unsub;
  }, [on, fetchData]);

  useEffect(() => {
    const unsub = on('order:rejected', () => { fetchData(); });
    return unsub;
  }, [on, fetchData]);

  // ── Generate AI suggestion ──────────────────────────────────
  const handleGenerate = async (productId: string) => {
    setGenerating(productId);
    try {
      const res = await suggestionApi.generate(productId);
      setSuggestions((prev) => [res.suggestion, ...prev]);
      toast({ title: 'AI Suggestion Ready', description: 'Demand prediction generated successfully' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate suggestion';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  // ── Open reorder dialog ─────────────────────────────────────
  const openReorder = (suggestion: AiSuggestionResponse) => {
    setReorderDialog(suggestion);
    setReorderQty(suggestion.suggestedReorderQty);
    setSelectedVendorId('');
  };

  // ── Submit reorder ──────────────────────────────────────────
  const handleSubmitReorder = async () => {
    if (!reorderDialog) return;
    setSubmitting(true);
    try {
      await orderApi.submitAiReorder({
        productId: reorderDialog.productId,
        aiSuggestionId: reorderDialog.id,
        finalQuantity: reorderQty,
        vendorId: selectedVendorId,
      });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === reorderDialog.id ? { ...s, status: 'SUBMITTED' as const } : s)),
      );
      toast({ title: 'Reorder Submitted', description: 'Sent to SME Owner for approval' });
      setReorderDialog(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit reorder';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived stats ───────────────────────────────────────────
  const activeSuggestions = suggestions.filter((s) => s.status === 'ACTIVE');
  const highPriority = activeSuggestions.filter((s) => s.daysToStockout <= 7);
  const potentialSavings = activeSuggestions.reduce(
    (sum, s) => sum + (s.suggestedReorderQty * (s.costPrice || 0) * 0.05),
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Suggestions</h1>
          <p className="text-muted-foreground">Smart recommendations to optimize your inventory.</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeSuggestions.length}</p>
            <p className="text-sm text-muted-foreground">Active Suggestions</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${potentialSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-muted-foreground">Potential Savings</p>
          </div>
        </div>
        <div className="card-dashboard flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10">
            <Lightbulb className="h-6 w-6 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{highPriority.length}</p>
            <p className="text-sm text-muted-foreground">High Priority</p>
          </div>
        </div>
      </div>

      {/* Products — Get AI Forecast */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Products — Get AI Forecast</h2>
        {products.length === 0 ? (
          <div className="card-dashboard text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">No products yet</p>
            <p className="text-muted-foreground">Add products to your inventory first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {products.map((product) => {
              const existing = activeSuggestions.find((s) => s.productId === product.id);
              const submitted = suggestions.find(
                (s) => s.productId === product.id && s.status === 'SUBMITTED',
              );
              return (
                <ProductAiCard
                  key={product.id}
                  product={product}
                  suggestion={existing || submitted || null}
                  isGenerating={generating === product.id}
                  onGenerate={() => handleGenerate(product.id)}
                  onReorder={existing ? () => openReorder(existing) : undefined}
                  onViewDetail={existing ? () => setDetailDialog(existing) : submitted ? () => setDetailDialog(submitted) : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* All Active Suggestions */}
      {activeSuggestions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">All Active Suggestions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onReorder={() => openReorder(s)} />
            ))}
          </div>
        </div>
      )}

      {/* Submitted for Approval */}
      {suggestions.filter((s) => s.status === 'SUBMITTED').length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Submitted for Approval</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {suggestions
              .filter((s) => s.status === 'SUBMITTED')
              .map((s) => (
                <SuggestionCard key={s.id} suggestion={s} />
              ))}
          </div>
        </div>
      )}

      {/* Forecast Explainability Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Demand Forecast — {detailDialog?.productName}
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <div className="space-y-4 py-2">
              {/* Core Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{detailDialog.predictedDailyDemand}</p>
                  <p className="text-xs text-muted-foreground">units/day predicted</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-destructive">{detailDialog.daysToStockout}d</p>
                  <p className="text-xs text-muted-foreground">until stockout</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{detailDialog.suggestedReorderQty}</p>
                  <p className="text-xs text-muted-foreground">suggested reorder qty</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{(detailDialog.confidence * 100).toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">ML confidence</p>
                </div>
              </div>

              {/* Stock Info */}
              <div className="bg-muted/30 rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-2">Stock Overview</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Current Stock</span>
                    <p className="font-semibold text-foreground">{detailDialog.currentStock} units</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue at Risk</span>
                    <p className="font-semibold text-foreground">
                      ${(detailDialog.predictedDailyDemand * detailDialog.daysToStockout * (detailDialog.sellingPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Method</span>
                    <p className="font-semibold text-foreground">{detailDialog.method || 'XGBoost'}</p>
                  </div>
                </div>
              </div>

              {/* LLM Context Explainability */}
              <div className={`rounded-lg p-3 border ${
                detailDialog.llmContext?.contextBoostApplied
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-muted/30 border-border'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className={`h-4 w-4 ${
                    detailDialog.llmContext?.contextBoostApplied ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <h4 className="text-sm font-medium text-foreground">Real-World Context Analysis</h4>
                  {detailDialog.llmContext?.contextBoostApplied && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                      ACTIVE BOOST
                    </span>
                  )}
                </div>
                {detailDialog.llmContext ? (
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">{detailDialog.llmContext.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Signal: <strong className={detailDialog.llmContext.signal === 'YES' ? 'text-primary' : 'text-foreground'}>{detailDialog.llmContext.signal}</strong></span>
                      <span>LLM Confidence: <strong>{(detailDialog.llmContext.confidence * 100).toFixed(0)}%</strong></span>
                      {detailDialog.llmContext.contextBoostApplied && (
                        <span>Demand Boost: <strong className="text-primary">+{((detailDialog.llmContext.boostMultiplier) * 100).toFixed(0)}%</strong></span>
                      )}
                    </div>
                    {detailDialog.llmContext.contextBoostApplied && (
                      <p className="text-xs text-primary/80 italic">
                        Demand figures above include the context boost. The base ML prediction was adjusted upward due to detected real-world conditions.
                      </p>
                    )}
                    {!detailDialog.llmContext.contextBoostApplied && detailDialog.llmContext.signal === 'NO' && (
                      <p className="text-xs text-muted-foreground italic">
                        No significant real-world events detected that would alter base demand. Prediction is based purely on ML analysis of historical sales data.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Context analysis not available for this prediction.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>Close</Button>
            {detailDialog?.status === 'ACTIVE' && (
              <Button onClick={() => { setDetailDialog(null); if (detailDialog) openReorder(detailDialog); }}>
                <ShoppingCart className="h-4 w-4" />
                <span className="ml-1">Reorder</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reorder Dialog */}
      <Dialog open={!!reorderDialog} onOpenChange={() => setReorderDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Reorder Request</DialogTitle>
          </DialogHeader>
          {reorderDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-medium">{reorderDialog.productName}</p>
                <p className="text-sm text-muted-foreground">{reorderDialog.productSku}</p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Stock:</span>{' '}
                    <span className="font-medium">{reorderDialog.currentStock}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Demand:</span>{' '}
                    <span className="font-medium">{reorderDialog.predictedDailyDemand}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days to Stockout:</span>{' '}
                    <span className="font-medium text-destructive">{reorderDialog.daysToStockout}d</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AI Confidence:</span>{' '}
                    <span className="font-medium">{(reorderDialog.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {reorderDialog.confidence < 0.6 && (
                <div className="flex items-start gap-2 bg-warning/10 rounded-lg p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Low confidence prediction. Consider reviewing sales data before ordering.
                  </p>
                </div>
              )}

              {reorderDialog.llmContext?.contextBoostApplied && (
                <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-primary text-xs">Health Context Detected</p>
                    <p className="text-foreground text-xs mt-0.5">{reorderDialog.llmContext.reason}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Demand boosted by +{((reorderDialog.llmContext.boostMultiplier) * 100).toFixed(0)}%
                      (LLM confidence: {(reorderDialog.llmContext.confidence * 100).toFixed(0)}%)
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Order Quantity{' '}
                  <span className="text-muted-foreground">(AI suggested: {reorderDialog.suggestedReorderQty})</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={reorderQty}
                  onChange={(e) => setReorderQty(Math.max(1, parseInt(e.target.value) || 0))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated cost: ${(reorderQty * (reorderDialog.costPrice || 0)).toLocaleString()}
                </p>
              </div>

              {/* Vendor Selection */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  <span className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" /> Assign Vendor
                  </span>
                </label>
                {approvedVendors.length > 0 ? (
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedVendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <span>{v.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Lead: {v.leadTimeDays}d · Score: {v.reliabilityScore}%
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-destructive">
                    No approved vendors available. Please approve a vendor first.
                  </p>
                )}
                {selectedVendorId && (() => {
                  const v = approvedVendors.find((v) => v.id === selectedVendorId);
                  return v ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. delivery: {v.leadTimeDays} days · Reliability: {v.reliabilityScore}%
                    </p>
                  ) : null;
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReorderDialog(null)}>Cancel</Button>
            <Button onClick={handleSubmitReorder} disabled={submitting || reorderQty < 1 || !selectedVendorId}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              <span className="ml-1">Submit for Approval</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product AI Card ─────────────────────────────────────────────
function ProductAiCard({
  product,
  suggestion,
  isGenerating,
  onGenerate,
  onReorder,
  onViewDetail,
}: {
  product: ProductResponse;
  suggestion: AiSuggestionResponse | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onReorder?: () => void;
  onViewDetail?: () => void;
}) {
  const isLowStock = product.status === 'low-stock' || product.status === 'out-of-stock';

  return (
    <div className={`card-dashboard border-l-4 ${isLowStock ? 'border-l-destructive bg-destructive/5' : suggestion ? 'border-l-primary bg-primary/5' : 'border-l-muted'}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <Package className={`h-5 w-5 ${isLowStock ? 'text-destructive' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground truncate">{product.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              product.status === 'out-of-stock' ? 'bg-destructive/10 text-destructive' :
              product.status === 'low-stock' ? 'bg-warning/10 text-warning' :
              'bg-success/10 text-success'
            }`}>
              {product.status.replace('-', ' ')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{product.sku}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span>Stock: <strong className="text-foreground">{product.currentStock}</strong></span>
            <span>Threshold: <strong className="text-foreground">{product.minThreshold}</strong></span>
          </div>

          {suggestion ? (
            <div className="bg-background rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">AI Prediction Available</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span>Demand: <strong>{suggestion.predictedDailyDemand}/day</strong></span>
                <span>Stockout: <strong className="text-destructive">{suggestion.daysToStockout}d</strong></span>
                <span>Reorder: <strong>{suggestion.suggestedReorderQty} units</strong></span>
                <span>Confidence: <strong>{(suggestion.confidence * 100).toFixed(0)}%</strong></span>
              </div>
              {suggestion.llmContext?.contextBoostApplied && (
                <div className="flex items-start gap-1.5 mt-2 text-xs text-primary">
                  <Sparkles className="h-3 w-3 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{suggestion.llmContext.reason}</span>
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {onViewDetail && (
                  <Button size="sm" variant="outline" className="flex-1" onClick={onViewDetail}>
                    <Info className="h-3.5 w-3.5" />
                    <span className="ml-1">View Details</span>
                  </Button>
                )}
                {onReorder && suggestion.status === 'ACTIVE' && (
                  <Button size="sm" className="flex-1" onClick={onReorder}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span className="ml-1">Reorder</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
              {suggestion.status === 'SUBMITTED' && (
                <div className="flex items-center gap-2 text-xs text-success mt-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Submitted for approval
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              <span className="ml-1">{isGenerating ? 'Analyzing...' : 'Get AI Suggestion'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Suggestion Card (Active Suggestions section) ────────────────
function SuggestionCard({
  suggestion,
  onReorder,
}: {
  suggestion: AiSuggestionResponse;
  onReorder?: () => void;
}) {
  const isUrgent = suggestion.daysToStockout <= 3;
  const isWarning = suggestion.daysToStockout <= 7 && suggestion.daysToStockout > 3;
  const isLowConf = suggestion.confidence < 0.6;

  return (
    <div className={`card-dashboard border-l-4 ${
      isUrgent ? 'border-l-destructive bg-destructive/5' :
      isWarning ? 'border-l-warning bg-warning/5' :
      'border-l-success bg-success/5'
    }`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">
          {isUrgent ? (
            <AlertTriangle className="h-5 w-5 text-destructive" />
          ) : isWarning ? (
            <Clock className="h-5 w-5 text-warning" />
          ) : (
            <TrendingUp className="h-5 w-5 text-success" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground">
              {isUrgent ? 'Stock-out Risk' : isWarning ? 'Reorder Soon' : 'Demand Forecast'}:{' '}
              {suggestion.productName}
            </h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isUrgent ? 'bg-destructive/10 text-destructive' :
              isWarning ? 'bg-warning/10 text-warning' :
              'bg-success/10 text-success'
            }`}>
              {isUrgent ? 'high' : isWarning ? 'medium' : 'low'}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Based on current sales velocity, stock will be depleted in{' '}
            <strong>{suggestion.daysToStockout} days</strong>.
            {isUrgent ? ' Recommend immediate reorder.' : ' Consider placing a reorder.'}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
            <span className="text-muted-foreground">
              Predicted demand: <strong className="text-foreground">{suggestion.predictedDailyDemand}/day</strong>
            </span>
            <span className="text-muted-foreground">
              Suggested qty: <strong className="text-foreground">{suggestion.suggestedReorderQty}</strong>
            </span>
            <span className="text-muted-foreground">
              Current stock: <strong className="text-foreground">{suggestion.currentStock}</strong>
            </span>
            <span className="text-muted-foreground">
              Confidence: <strong className="text-foreground">{(suggestion.confidence * 100).toFixed(0)}%</strong>
            </span>
          </div>

          {isLowConf && (
            <div className="flex items-center gap-1 text-xs text-warning mb-2">
              <Info className="h-3 w-3" />
              Low confidence — review before ordering
            </div>
          )}

          {/* LLM Health-Context Banner */}
          {suggestion.llmContext?.contextBoostApplied && (
            <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg p-2.5 mb-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-primary">Demand increased due to:</span>{' '}
                <span className="text-foreground">{suggestion.llmContext.reason}</span>
                <span className="text-muted-foreground ml-1">
                  (+{((suggestion.llmContext.boostMultiplier) * 100).toFixed(0)}% boost, {(suggestion.llmContext.confidence * 100).toFixed(0)}% LLM confidence)
                </span>
              </div>
            </div>
          )}

          <p className="text-sm font-medium text-foreground">
            Potential revenue at risk: $
            {(suggestion.predictedDailyDemand * suggestion.daysToStockout * (suggestion.sellingPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>

          {suggestion.status === 'ACTIVE' && onReorder && (
            <Button size="sm" className="mt-3" onClick={onReorder}>
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="ml-1">Submit Reorder</span>
            </Button>
          )}
          {suggestion.status === 'SUBMITTED' && (
            <div className="flex items-center gap-2 text-sm text-success mt-3">
              <CheckCircle className="h-4 w-4" />
              Reorder submitted — awaiting owner approval
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
