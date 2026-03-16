import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import PriceChart from './components/PriceChart';
import './index.css';

interface Item {
  id: number;
  url: string;
  name: string;
  image_url: string;
  current_price: number;
}

interface PricePoint {
  price: number;
  timestamp: string;
}

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState<Record<number, PricePoint[]>>({});
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:3001/api';

  useEffect(() => {
    fetchItems();
    const timer = setInterval(fetchItems, 60000); // 1分ごとに一覧更新
    return () => clearInterval(timer);
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_BASE}/items`);
      setItems(res.data);
      // 各商品の履歴も取得
      res.data.forEach((item: Item) => fetchHistory(item.id));
    } catch (err) {
      console.error('Failed to fetch items');
    }
  };

  const fetchHistory = async (itemId: number) => {
    try {
      const res = await axios.get(`${API_BASE}/items/${itemId}/history`);
      setHistories(prev => ({ ...prev, [itemId]: res.data }));
    } catch (err) {
      console.error('Failed to fetch history for', itemId);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${API_BASE}/items`, { url });
      setUrl('');
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.error || '商品の追加に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('この商品を削除しますか？')) return;
    try {
      await axios.delete(`${API_BASE}/items/${id}`);
      fetchItems();
    } catch (err) {
      console.error('Failed to delete');
    }
  };

  return (
    <div className="container">
      <header>
        <h1>Mercari Price Tracker</h1>
        <p className="subtitle">お気に入りの商品の価格変動を30分ごとに自動チェック</p>
      </header>

      <form className="add-item-form" onSubmit={addItem}>
        <input
          type="url"
          placeholder="メルカリの商品のURLを入力..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !url}>
          {loading ? <div className="loading-spinner"></div> : <><Plus size={20} style={{marginRight: '8px'}} />追加</>}
        </button>
      </form>

      {error && (
        <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', color: '#ff4d4d', padding: '12px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="items-grid">
        {items.map((item) => (
          <div key={item.id} className="card item-card">
            <div className="item-header">
              <img src={item.image_url} alt={item.name} className="item-image" />
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-price">¥{item.current_price.toLocaleString()}</div>
              </div>
              <button className="delete-btn" onClick={() => deleteItem(item.id)}>
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="chart-container">
              <PriceChart data={histories[item.id] || []} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={12} /> 30分ごとにチェック中
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                メルカリで見る
              </a>
            </div>
          </div>
        ))}

        {items.length === 0 && !loading && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '2px dashed var(--border)', borderRadius: '16px' }}>
            <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>追跡している商品がありません。上のフォームからURLを追加してください。</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
