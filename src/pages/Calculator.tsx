import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const CalculatorPage = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState<{eq: string, res: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [memory, setMemory] = useState(0);

  // Business specific states
  const [gstRate, setGstRate] = useState(18);
  const [marginRate, setMarginRate] = useState(20);

  const handleNumber = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const fullEq = equation + display;
      // Using Function constructor for a simple calculator evaluation 
      // In a real production app, use a math library like mathjs
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
    const gst = (val * gstRate) / 100;
    const total = val + gst;
    setEquation(`${val} + ${gstRate}% GST`);
    setDisplay(total.toFixed(2));
  };

  const removeGST = () => {
    const val = parseFloat(display);
    const base = val / (1 + gstRate / 100);
    setEquation(`${val} - ${gstRate}% GST`);
    setDisplay(base.toFixed(2));
  };

  const applyMargin = () => {
    const cost = parseFloat(display);
    const price = cost / (1 - marginRate / 100);
    setEquation(`${cost} @ ${marginRate}% Margin`);
    setDisplay(price.toFixed(2));
  };

  const calcProfit = () => {
    if (equation.includes('@')) {
      const cost = parseFloat(equation.split(' ')[0]);
      const price = parseFloat(display);
      setDisplay((price - cost).toFixed(2));
      setEquation(`Profit from ${cost} to ${price}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg">
            <CalcIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Business Smart Calculator</h1>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide History' : 'Show History'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Calculator */}
        <Card className="lg:col-span-2 overflow-hidden border-2 shadow-xl bg-card">
          <CardContent className="p-0">
            {/* Display Area */}
            <div className="bg-muted/30 p-6 text-right space-y-1 min-h-[120px] flex flex-col justify-end border-b">
              <div className="text-sm text-muted-foreground font-mono h-6 overflow-hidden">
                {equation}
              </div>
              <div className="text-5xl font-bold tracking-tighter truncate font-mono">
                {display}
              </div>
            </div>

            {/* Business Quick Keys */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted/20 border-b">
              <Button variant="ghost" className="h-12 text-xs font-bold gap-1" onClick={addGST}>
                <Plus className="w-3 h-3" />GST
              </Button>
              <Button variant="ghost" className="h-12 text-xs font-bold gap-1" onClick={removeGST}>
                <Minus className="w-3 h-3" />GST
              </Button>
              <Button variant="ghost" className="h-12 text-xs font-bold gap-1" onClick={applyMargin}>
                MARGIN
              </Button>
              <Button variant="ghost" className="h-12 text-xs font-bold gap-1" onClick={calcProfit}>
                PROFIT
              </Button>
            </div>

            {/* Standard Keys - Casio Style Layout */}
            <div className="p-4 grid grid-cols-4 gap-3 bg-card">
              {/* Row 1 */}
              <Button variant="destructive" className="h-16 text-lg font-bold" onClick={clear}>AC</Button>
              <Button variant="outline" className="h-16 text-lg font-bold" onClick={backspace}><Delete className="w-5 h-5" /></Button>
              <Button variant="secondary" className="h-16 text-lg font-bold" onClick={() => handleOperator('%')}><Percent className="w-5 h-5" /></Button>
              <Button variant="secondary" className="h-16 text-lg font-bold" onClick={() => handleOperator('÷')}><Divide className="w-5 h-5" /></Button>

              {/* Row 2 */}
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('7')}>7</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('8')}>8</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('9')}>9</Button>
              <Button variant="secondary" className="h-16 text-lg font-bold" onClick={() => handleOperator('x')}><X className="w-5 h-5" /></Button>

              {/* Row 3 */}
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('4')}>4</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('5')}>5</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('6')}>6</Button>
              <Button variant="secondary" className="h-16 text-lg font-bold" onClick={() => handleOperator('-')}><Minus className="w-5 h-5" /></Button>

              {/* Row 4 */}
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('1')}>1</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('2')}>2</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('3')}>3</Button>
              <Button variant="secondary" className="h-16 text-lg font-bold" onClick={() => handleOperator('+')}><Plus className="w-5 h-5" /></Button>

              {/* Row 5 */}
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('0')}>0</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('00')}>00</Button>
              <Button variant="ghost" className="h-16 text-2xl font-semibold hover:bg-muted" onClick={() => handleNumber('.')}>.</Button>
              <Button variant="primary" className="h-16 text-lg font-bold bg-primary hover:bg-primary/90" onClick={calculate}><Equal className="w-6 h-6" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Settings & History */}
        <div className="space-y-6">
          <Card className="border-2 shadow-lg">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                <Receipt className="w-4 h-4" /> Business Config
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Default GST Rate</span>
                    <span className="text-primary">{gstRate}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[5, 12, 18, 28].map(rate => (
                      <Button 
                        key={rate} 
                        size="sm" 
                        variant={gstRate === rate ? 'default' : 'outline'}
                        className="h-8 text-[10px]"
                        onClick={() => setGstRate(rate)}
                      >
                        {rate}%
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Target Margin</span>
                    <span className="text-primary">{marginRate}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[10, 20, 30, 50].map(rate => (
                      <Button 
                        key={rate} 
                        size="sm" 
                        variant={marginRate === rate ? 'default' : 'outline'}
                        className="h-8 text-[10px]"
                        onClick={() => setMarginRate(rate)}
                      >
                        {rate}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {showHistory && (
            <Card className="border-2 shadow-lg animate-in slide-in-from-right duration-300">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                    <History className="w-4 h-4" /> Recent Logs
                  </h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHistory([])}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                  {history.length === 0 ? (
                    <p className="text-xs text-center py-8 text-muted-foreground italic">No history yet</p>
                  ) : (
                    history.map((item, i) => (
                      <div key={i} className="p-2 rounded bg-muted/50 border text-right space-y-1">
                        <div className="text-[10px] text-muted-foreground font-mono">{item.eq}</div>
                        <div className="text-sm font-bold font-mono text-primary cursor-pointer" onClick={() => setDisplay(item.res)}>
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
