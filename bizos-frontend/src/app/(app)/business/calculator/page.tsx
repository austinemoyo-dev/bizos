'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { formatNaira } from '@/lib/format';
import { Calculator, Wrench, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'margin' | 'repair';

export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('margin');

  // Margin Calculator State
  const [costPrice, setCostPrice] = useState<number>(0);
  const [targetMargin, setTargetMargin] = useState<number>(20); // percentage

  const recommendedPrice = costPrice / (1 - targetMargin / 100);
  const profitAmount = recommendedPrice - costPrice;

  // Repair Estimator State
  const [parts, setParts] = useState<{ id: string; name: string; cost: number; price: number }[]>([]);
  const [laborCharge, setLaborCharge] = useState<number>(0);
  const [partNameInput, setPartNameInput] = useState('');
  const [partCostInput, setPartCostInput] = useState<number>(0);
  const [partPriceInput, setPartPriceInput] = useState<number>(0);

  const addPart = () => {
    if (!partNameInput || partPriceInput <= 0) return;
    setParts([...parts, { id: Math.random().toString(), name: partNameInput, cost: partCostInput, price: partPriceInput }]);
    setPartNameInput('');
    setPartCostInput(0);
    setPartPriceInput(0);
  };

  const removePart = (id: string) => {
    setParts(parts.filter(p => p.id !== id));
  };

  const totalPartsCost = parts.reduce((sum, p) => sum + p.cost, 0);
  const totalPartsPrice = parts.reduce((sum, p) => sum + p.price, 0);
  const totalQuote = totalPartsPrice + laborCharge;
  const estimatedProfit = (totalPartsPrice - totalPartsCost) + laborCharge;

  return (
    <div>
      <PageHeader
        title="Price Calculator"
        subtitle="Estimate selling prices and repair quotes"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-6)' }}>
        <button
          onClick={() => setActiveTab('margin')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            background: activeTab === 'margin' ? '#C8102E' : 'var(--bg-elevated)',
            color: activeTab === 'margin' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          <Calculator size={16} /> Margin Calculator
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 'var(--text-sm)', fontWeight: 600,
            background: activeTab === 'repair' ? '#C8102E' : 'var(--bg-elevated)',
            color: activeTab === 'repair' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}
        >
          <Wrench size={16} /> Repair Estimator
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'margin' ? (
          <motion.div key="margin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 600 }}>
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Calculate Selling Price</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Cost Price (What you paid)</label>
                  <CurrencyInput value={costPrice} onChange={setCostPrice} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Target Profit Margin (%)</label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }} className="calc-margin-btns">
                    {[10, 20, 30, 40, 50].map(m => (
                      <button 
                        key={m} 
                        type="button"
                        onClick={() => setTargetMargin(m)}
                        style={{ 
                          padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${targetMargin === m ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                          background: targetMargin === m ? 'rgba(200,16,46,0.1)' : 'var(--bg-base)',
                          color: targetMargin === m ? 'var(--accent-primary)' : 'var(--text-primary)',
                          fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {m}%
                      </button>
                    ))}
                    <input 
                      type="number" 
                      className="input" 
                      style={{ width: 80, padding: '6px 10px' }} 
                      value={targetMargin} 
                      onChange={e => setTargetMargin(Number(e.target.value))} 
                    />
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-2) 0' }} />

                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 'var(--space-5)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommended Selling Price</p>
                  <p style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-green)', margin: 'var(--space-2) 0' }}>
                    {costPrice > 0 ? formatNaira(recommendedPrice) : '₦0.00'}
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Estimated Profit: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{costPrice > 0 ? formatNaira(profitAmount) : '₦0.00'}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="repair" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-6)', alignItems: 'start' }} className="calc-repair-grid">
              
              {/* Part Entry */}
              <div className="card" style={{ padding: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Add Parts Required</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-2)', alignItems: 'end', marginBottom: 'var(--space-6)' }} className="calc-parts-input-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Part Name</label>
                    <input className="input" placeholder="e.g. Screen Replacement" value={partNameInput} onChange={e => setPartNameInput(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Your Cost</label>
                    <CurrencyInput value={partCostInput} onChange={setPartCostInput} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Price to Customer</label>
                    <CurrencyInput value={partPriceInput} onChange={setPartPriceInput} />
                  </div>
                  <button className="btn-primary" onClick={addPart} disabled={!partNameInput || partPriceInput <= 0} style={{ padding: '0 12px', height: 42 }}>
                    <Plus size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {parts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 'var(--space-4)' }}>No parts added yet.</p>
                  ) : (
                    parts.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.name}</p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Cost: {formatNaira(p.cost)}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatNaira(p.price)}</p>
                          <button className="btn-ghost" style={{ padding: 4, color: 'var(--accent-red)' }} onClick={() => removePart(p.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: 'var(--space-6) 0' }} />

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Labor Charge</label>
                  <div style={{ maxWidth: 200 }}>
                    <CurrencyInput value={laborCharge} onChange={setLaborCharge} />
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>Labor is counted entirely as profit.</p>
                </div>
              </div>

              {/* Quote Summary */}
              <div className="card" style={{ padding: 'var(--space-6)', position: 'sticky', top: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Quote Summary</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Parts Total:</span>
                    <span style={{ fontWeight: 600 }}>{formatNaira(totalPartsPrice)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Labor:</span>
                    <span style={{ fontWeight: 600 }}>{formatNaira(laborCharge)}</span>
                  </div>
                  <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-lg)', fontWeight: 800 }}>
                    <span>Total Quote:</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{formatNaira(totalQuote)}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Estimated Profit (Parts Margin + Labor):</p>
                  <p style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--accent-green)' }}>{formatNaira(estimatedProfit)}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
