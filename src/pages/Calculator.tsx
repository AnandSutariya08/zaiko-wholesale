import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Percent, TrendingUp, DollarSign, PieChart } from "lucide-react";

const BusinessCalculator = () => {
  // Margin & Markup
  const [cost, setCost] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  
  // GST
  const [amount, setAmount] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);

  // ROI
  const [investment, setInvestment] = useState<number>(0);
  const [returnVal, setReturnVal] = useState<number>(0);

  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
  const markup = cost > 0 ? ((price - cost) / cost) * 100 : 0;
  const profit = price - cost;

  const gstAmount = (amount * gstRate) / 100;
  const totalWithGst = amount + gstAmount;

  const roi = investment > 0 ? ((returnVal - investment) / investment) * 100 : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Business Smart Calculator</h1>
      </div>

      <Tabs defaultValue="margin" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="margin" className="flex gap-2">
            <TrendingUp className="w-4 h-4" /> Margin & Profit
          </TabsTrigger>
          <TabsTrigger value="gst" className="flex gap-2">
            <Percent className="w-4 h-4" /> GST Calculator
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex gap-2">
            <PieChart className="w-4 h-4" /> ROI Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="margin">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin & Markup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost Price</Label>
                  <Input 
                    id="cost" 
                    type="number" 
                    value={cost} 
                    onChange={(e) => setCost(Number(e.target.value))} 
                    placeholder="Enter cost price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Selling Price</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value))} 
                    placeholder="Enter selling price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Gross Profit</p>
                  <p className="text-2xl font-bold text-primary">₹{profit.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Margin</p>
                  <p className="text-2xl font-bold text-green-600">{margin.toFixed(2)}%</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Markup</p>
                  <p className="text-2xl font-bold text-blue-600">{markup.toFixed(2)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gst">
          <Card>
            <CardHeader>
              <CardTitle>GST (Goods and Services Tax)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Base Amount</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))} 
                    placeholder="Enter base amount"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstRate">GST Rate (%)</Label>
                  <Input 
                    id="gstRate" 
                    type="number" 
                    value={gstRate} 
                    onChange={(e) => setGstRate(Number(e.target.value))} 
                    placeholder="e.g. 5, 12, 18, 28"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">GST Amount</p>
                  <p className="text-2xl font-bold text-primary">₹{gstAmount.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground uppercase font-semibold">Total Amount</p>
                  <p className="text-2xl font-bold text-green-600">₹{totalWithGst.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roi">
          <Card>
            <CardHeader>
              <CardTitle>Return on Investment (ROI)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="investment">Investment Amount</Label>
                  <Input 
                    id="investment" 
                    type="number" 
                    value={investment} 
                    onChange={(e) => setInvestment(Number(e.target.value))} 
                    placeholder="Initial investment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return">Total Return</Label>
                  <Input 
                    id="return" 
                    type="number" 
                    value={returnVal} 
                    onChange={(e) => setReturnVal(Number(e.target.value))} 
                    placeholder="Final value"
                  />
                </div>
              </div>

              <div className="mt-6 p-6 bg-primary/10 rounded-xl text-center">
                <p className="text-sm text-muted-foreground uppercase font-semibold mb-2">ROI Percentage</p>
                <p className={`text-4xl font-black ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roi.toFixed(2)}%
                </p>
                <p className="text-sm mt-2 text-muted-foreground">
                  Profit: ₹{(returnVal - investment).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessCalculator;
