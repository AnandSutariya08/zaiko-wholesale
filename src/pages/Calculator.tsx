import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calculator as CalcIcon, 
  History, 
  Trash2, 
  Percent, 
  TrendingUp, 
  Receipt,
  Delete,
  Divide,
  X,
  Minus,
  Plus,
  Equal,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Tag,
  ArrowRightLeft,
  Info,
  Banknote,
  Briefcase,
  TrendingDown,
  Scale
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CalculatorPage = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<{eq: string, res: string, type?: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [memory, setMemory] = useState(0);

  // Business specific states
  const [gstRate, setGstRate] = useState(18);
  const [marginRate, setMarginRate] = useState(20);
  const [discountRate, setDiscountRate] = useState(10);
  const [taxRate, setTaxRate] = useState(5);

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    if (display === 'Error') return;
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      if (!equation || display === 'Error') return;
      const fullEq = equation + display;
      // Using Function constructor for a simple calculator evaluation 
      const result = new Function('return ' + fullEq.replace(/x/g, '*').replace(/÷/g, '/'))();
      const formattedResult = Number(result.toFixed(4)).toString();
      
      setHistory([{ eq: fullEq, res: formattedResult }, ...history].slice(0, 10));
      setDisplay(formattedResult);
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  // Business Functions
  const addGST = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const gst = (val * gstRate) / 100;
    const total = val + gst;
    const res = total.toFixed(2);
    setHistory([{ eq: `${val} + ${gstRate}% GST`, res, type: 'GST' }, ...history].slice(0, 10));
    setEquation(`${val} + ${gstRate}% GST`);
    setDisplay(res);
  };

  const removeGST = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const base = val / (1 + gstRate / 100);
    const res = base.toFixed(2);
    setHistory([{ eq: `${val} - ${gstRate}% GST`, res, type: 'GST' }, ...history].slice(0, 10));
    setEquation(`${val} incl. ${gstRate}% GST`);
    setDisplay(res);
  };

  const applyMargin = () => {
    const cost = parseFloat(display);
    if (isNaN(cost)) return;
    const price = cost / (1 - marginRate / 100);
    const res = price.toFixed(2);
    setHistory([{ eq: `${cost} @ ${marginRate}% Margin`, res, type: 'Margin' }, ...history].slice(0, 10));
    setEquation(`${cost} cost + ${marginRate}% Margin`);
    setDisplay(res);
  };

  const applyDiscount = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const discount = (val * discountRate) / 100;
    const res = (val - discount).toFixed(2);
    setHistory([{ eq: `${val} - ${discountRate}% Disc`, res, type: 'Discount' }, ...history].slice(0, 10));
    setEquation(`${val} - ${discountRate}% Discount`);
    setDisplay(res);
  };

  const calculateMarkup = () => {
    const cost = parseFloat(display);
    if (isNaN(cost)) return;
    const markup = (cost * marginRate) / 100;
    const res = (cost + markup).toFixed(2);
    setHistory([{ eq: `${cost} + ${marginRate}% Markup`, res, type: 'Markup' }, ...history].slice(0, 10));
    setEquation(`${cost} cost + ${marginRate}% Markup`);
    setDisplay(res);
  };

  const calculateTax = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const tax = (val * taxRate) / 100;
    const res = (val + tax).toFixed(2);
    setHistory([{ eq: `${val} + ${taxRate}% Tax`, res, type: 'Tax' }, ...history].slice(0, 10));
    setEquation(`${val} + ${taxRate}% Tax`);
    setDisplay(res);
  };

  const calculateProfit = () => {
    const val = parseFloat(display);
    if (isNaN(val)) return;
    const profit = val * (marginRate / 100);
    const res = profit.toFixed(2);
    setHistory([{ eq: `Profit on ${val} (${marginRate}%)`, res, type: 'Profit' }, ...history].slice(0, 10));
    setEquation(`Profit on ${val} @ ${marginRate}%`);
    setDisplay(res);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="bg-card rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <CalcIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Business Calculator</h1>
            <p className="text-sm text-muted-foreground font-medium tracking-wide">Financial precision for your business growth</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              "gap-2 transition-all", 
              showHistory && "bg-primary/10 border-primary/50 text-primary"
            )}
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : 'View History'}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Advanced calculation tools for professional business analysis</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Calculator Body */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <Card className="overflow-hidden border shadow-lg bg-card rounded-2xl">
            <CardContent className="p-0">
              {/* Display Area */}
              <div className="bg-muted/30 dark:bg-black/40 p-10 text-right space-y-3 min-h-[180px] flex flex-col justify-end border-b">
                <div className="text-sm font-mono tracking-widest text-primary/70 h-6 overflow-hidden uppercase">
                  {equation || 'SYSTEM READY'}
                </div>
                <div className="text-7xl font-bold tracking-tighter text-foreground font-mono break-all leading-none">
                  {display}
                </div>
              </div>

              {/* Enhanced Business Control Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-muted/20 border-b">
                <Button variant="outline" className="h-14 text-xs font-bold gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all" onClick={addGST}>
                  <Plus className="w-4 h-4" /> GST
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-2 border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all" onClick={removeGST}>
                  <Minus className="w-4 h-4" /> GST
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-2 border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all" onClick={applyMargin}>
                  <TrendingUp className="w-4 h-4" /> MARGIN
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-2 border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all" onClick={applyDiscount}>
                  <Tag className="w-4 h-4" /> DISCOUNT
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-2 border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all md:hidden lg:flex" onClick={calculateProfit}>
                  <Banknote className="w-4 h-4" /> PROFIT
                </Button>
              </div>

              {/* Business Helper Extra Row */}
              <div className="grid grid-cols-3 gap-3 px-4 pb-4 bg-muted/20">
                <Button variant="outline" size="sm" className="h-10 text-[10px] font-bold border-muted-foreground/20 bg-background/50 hover:bg-muted" onClick={calculateMarkup}>
                  <TrendingUp className="w-3 h-3 mr-1" /> MARKUP
                </Button>
                <Button variant="outline" size="sm" className="h-10 text-[10px] font-bold border-muted-foreground/20 bg-background/50 hover:bg-muted" onClick={calculateTax}>
                  <Scale className="w-3 h-3 mr-1" /> TAX+
                </Button>
                <Button variant="outline" size="sm" className="h-10 text-[10px] font-bold border-muted-foreground/20 bg-background/50 hover:bg-muted" onClick={() => {
                  const val = parseFloat(display);
                  if(!isNaN(val)) setMemory(val);
                }}>
                  <Briefcase className="w-3 h-3 mr-1" /> SAVE MEM
                </Button>
              </div>

              {/* Professional Keypad */}
              <div className="p-8 grid grid-cols-4 gap-4 bg-card">
                {/* Row 1 */}
                <Button variant="destructive" className="h-20 text-xl font-black shadow-md active:scale-95 transition-all" onClick={clear}>AC</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md active:scale-95 transition-all" onClick={backspace}><Delete className="w-6 h-6" /></Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md active:scale-95 transition-all" onClick={() => handleOperator('%')}><Percent className="w-6 h-6" /></Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md text-primary active:scale-95 transition-all border border-primary/10" onClick={() => handleOperator('÷')}><Divide className="w-6 h-6" /></Button>

                {/* Row 2 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('7')}>7</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('8')}>8</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('9')}>9</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md text-primary active:scale-95 transition-all border border-primary/10" onClick={() => handleOperator('x')}><X className="w-6 h-6" /></Button>

                {/* Row 3 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('4')}>4</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('5')}>5</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('6')}>6</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md text-primary active:scale-95 transition-all border border-primary/10" onClick={() => handleOperator('-')}><Minus className="w-6 h-6" /></Button>

                {/* Row 4 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('1')}>1</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('2')}>2</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('3')}>3</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-md text-primary active:scale-95 transition-all border border-primary/10" onClick={() => handleOperator('+')}><Plus className="w-6 h-6" /></Button>

                {/* Row 5 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('0')}>0</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('00')}>00</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold bg-muted/40 hover:bg-muted border border-border/50 active:scale-95 transition-all" onClick={() => handleNumber('.')}>.</Button>
                <Button variant="default" className="h-20 text-xl font-black bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all" onClick={calculate}><Equal className="w-8 h-8" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Settings & Logs */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <Card className="border shadow-xl bg-card">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-primary">
                <Receipt className="w-4 h-4" /> Calculator Config
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              {/* Dynamic Rates Configuration */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">GST RATE (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={gstRate} 
                      onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 bg-muted border-border text-center font-mono font-bold text-primary"
                    />
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{gstRate}%</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 12, 18, 28].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={gstRate === rate ? 'default' : 'outline'}
                      className={cn(
                        "h-9 text-[11px] font-bold transition-all"
                      )}
                      onClick={() => setGstRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">MARGIN/MARKUP (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={marginRate} 
                      onChange={(e) => setMarginRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 bg-muted border-border text-center font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                    <Badge variant="outline" className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{marginRate}%</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 20, 30, 50].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={marginRate === rate ? 'default' : 'outline'}
                      className={cn(
                        "h-9 text-[11px] font-bold transition-all",
                        marginRate === rate && "bg-emerald-600 hover:bg-emerald-500 text-white"
                      )}
                      onClick={() => setMarginRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">QUICK DISCOUNT (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={discountRate} 
                      onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 bg-muted border-border text-center font-mono font-bold text-amber-600 dark:text-amber-400"
                    />
                    <Badge variant="outline" className="bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20">{discountRate}%</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 25].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={discountRate === rate ? 'default' : 'outline'}
                      className={cn(
                        "h-9 text-[11px] font-bold transition-all",
                        discountRate === rate && "bg-amber-600 hover:bg-amber-500 text-white"
                      )}
                      onClick={() => setDiscountRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">CUSTOM TAX (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={taxRate} 
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 bg-muted border-border text-center font-mono font-bold text-indigo-600 dark:text-indigo-400"
                    />
                    <Badge variant="outline" className="bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">{taxRate}%</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {showHistory && (
            <Card className="border shadow-xl bg-card animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-muted-foreground">
                  <History className="w-4 h-4" /> Audit Logs
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setHistory([])}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-16 opacity-30">
                      <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-xs font-bold tracking-widest uppercase">No Records Found</p>
                    </div>
                  ) : (
                    history.map((item, i) => (
                      <div key={i} className="group p-4 rounded-xl bg-muted/30 border border-transparent hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer text-right shadow-sm" onClick={() => setDisplay(item.res)}>
                        <div className="flex justify-between items-center mb-2">
                          {item.type && <Badge variant="outline" className="text-[9px] font-black h-5 uppercase bg-primary/10 text-primary border-primary/20">{item.type}</Badge>}
                          <div className="text-xs text-muted-foreground font-mono flex-1 font-medium">{item.eq}</div>
                        </div>
                        <div className="text-xl font-bold font-mono text-foreground group-hover:text-primary transition-colors">
                          {item.res}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculatorPage;
