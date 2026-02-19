import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Info
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section - Simulating Dashboard Box Look */}
      <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <CalcIcon className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Business Calculator</h1>
            <p className="text-sm text-muted-foreground">Advanced financial tools for GST, Margins, and Discounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowHistory(!showHistory)}
            className={cn("gap-2 border-primary/20 hover:bg-primary/5 transition-all", showHistory && "bg-primary/5 border-primary")}
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide Logs' : 'View Logs'}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Use specialized keys for quick business calculations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Calculator Body */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="overflow-hidden border shadow-lg bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Display Area - High Precision Look */}
              <div className="bg-slate-950 p-8 text-right space-y-2 min-h-[160px] flex flex-col justify-end border-b-4 border-primary/20">
                <div className="text-sm text-primary/60 font-mono tracking-widest uppercase h-6 overflow-hidden">
                  {equation || 'READY'}
                </div>
                <div className="text-6xl font-bold tracking-tighter text-white font-mono drop-shadow-sm">
                  {display}
                </div>
              </div>

              {/* Advanced Business Control Strip */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-muted/40 border-b">
                <Button variant="outline" className="h-14 text-xs font-bold gap-1 border-primary/20 hover:border-primary hover:text-primary transition-all group" onClick={addGST}>
                  <Plus className="w-3 h-3 group-hover:scale-110 transition-transform" /> GST
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-1 border-primary/20 hover:border-primary hover:text-primary transition-all group" onClick={removeGST}>
                  <Minus className="w-3 h-3 group-hover:scale-110 transition-transform" /> GST
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-1 border-primary/20 hover:border-primary hover:text-primary transition-all group" onClick={applyMargin}>
                  <TrendingUp className="w-3 h-3 group-hover:scale-110 transition-transform" /> MARGIN
                </Button>
                <Button variant="outline" className="h-14 text-xs font-bold gap-1 border-primary/20 hover:border-primary hover:text-primary transition-all group" onClick={applyDiscount}>
                  <Tag className="w-3 h-3 group-hover:scale-110 transition-transform" /> DISC
                </Button>
              </div>

              {/* Professional Keypad */}
              <div className="p-6 grid grid-cols-4 gap-4 bg-card/30">
                {/* Row 1 */}
                <Button variant="destructive" className="h-20 text-xl font-black shadow-sm" onClick={clear}>AC</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={backspace}><Delete className="w-6 h-6" /></Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={() => handleOperator('%')}><Percent className="w-6 h-6" /></Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={() => handleOperator('÷')}><Divide className="w-6 h-6" /></Button>

                {/* Row 2 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('7')}>7</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('8')}>8</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('9')}>9</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={() => handleOperator('x')}><X className="w-6 h-6" /></Button>

                {/* Row 3 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('4')}>4</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('5')}>5</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('6')}>6</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={() => handleOperator('-')}><Minus className="w-6 h-6" /></Button>

                {/* Row 4 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('1')}>1</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('2')}>2</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('3')}>3</Button>
                <Button variant="secondary" className="h-20 text-xl font-bold shadow-sm" onClick={() => handleOperator('+')}><Plus className="w-6 h-6" /></Button>

                {/* Row 5 */}
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('0')}>0</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('00')}>00</Button>
                <Button variant="ghost" className="h-20 text-3xl font-bold hover:bg-muted shadow-sm border" onClick={() => handleNumber('.')}>.</Button>
                <Button variant="default" className="h-20 text-xl font-black bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={calculate}><Equal className="w-8 h-8" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Settings & Logs */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter text-primary">
                <Receipt className="w-4 h-4" /> Calculator Config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-muted-foreground">GST RATE</Label>
                  <Badge variant="secondary" className="font-mono">{gstRate}%</Badge>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 12, 18, 28].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={gstRate === rate ? 'default' : 'outline'}
                      className="h-9 text-[10px] font-bold"
                      onClick={() => setGstRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-muted-foreground">TARGET MARGIN</Label>
                  <Badge variant="secondary" className="font-mono">{marginRate}%</Badge>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[10, 20, 30, 50].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={marginRate === rate ? 'default' : 'outline'}
                      className="h-9 text-[10px] font-bold"
                      onClick={() => setMarginRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-muted-foreground">QUICK DISCOUNT</Label>
                  <Badge variant="secondary" className="font-mono">{discountRate}%</Badge>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[5, 10, 15, 25].map(rate => (
                    <Button 
                      key={rate} 
                      size="sm" 
                      variant={discountRate === rate ? 'default' : 'outline'}
                      className="h-9 text-[10px] font-bold"
                      onClick={() => setDiscountRate(rate)}
                    >
                      {rate}%
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {showHistory && (
            <Card className="border shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-tighter text-muted-foreground">
                  <History className="w-4 h-4" /> Audit Logs
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setHistory([])}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs italic">No activity logs recorded</p>
                    </div>
                  ) : (
                    history.map((item, i) => (
                      <div key={i} className="group p-3 rounded-lg bg-muted/30 border hover:border-primary/50 transition-all cursor-pointer text-right" onClick={() => setDisplay(item.res)}>
                        <div className="flex justify-between items-center mb-1">
                          {item.type && <Badge variant="outline" className="text-[8px] h-4 uppercase">{item.type}</Badge>}
                          <div className="text-[10px] text-muted-foreground font-mono flex-1">{item.eq}</div>
                        </div>
                        <div className="text-base font-bold font-mono text-primary">
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
