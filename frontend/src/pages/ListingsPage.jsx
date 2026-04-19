import { useEffect, useState, useCallback } from 'react';
import {
  getListings,
  createListing,
  updateListing,
  deleteListing,
  syncListing,
  reconcileListing,
  getListingLogs
} from '../api/listingsApi';
import { getMe, getLoginUrl, logoutMercadoLivre } from '../api/authApi';

const initialForm = {
  title: '',
  price: '',
  availableQuantity: '',
  categoryId: '',
  pictureUrl: '',
  attributesText: `[
  { "id": "BRAND", "value_name": "Redragon" },
  { "id": "MODEL", "value_name": "M711" },
  { "id": "COLOR", "value_name": "Preto" }
]`
};

function statusColor(status) {
  switch (status) {
    case 'synced':
      return '#166534';
    case 'pending':
      return '#92400e';
    case 'error':
      return '#991b1b';
    case 'conflict':
      return '#7c3aed';
    case 'success':
      return '#166534';
    case 'warning':
      return '#92400e';
    default:
      return '#374151';
  }
}

function badgeStyle(status) {
  return {
    display: 'inline-block',
    padding: '0.3rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    background: '#f3f4f6',
    color: statusColor(status)
  };
}

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [authInfo, setAuthInfo] = useState({
    connected: false,
    user: null
  });
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [selectedLogTitle, setSelectedLogTitle] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const loadAuth = useCallback(async () => {
    try {
      const { data } = await getMe();
      setAuthInfo(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setErrorDetails('');

      const params = search ? { search } : {};
      const { data } = await getListings(params);
      setListings(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadListings();
    loadAuth();
  }, [loadListings, loadAuth]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const clearMessages = () => {
    setError('');
    setErrorDetails('');
    setSuccess('');
  };

  const parseAttributes = () => {
    try {
      return JSON.parse(form.attributesText);
    } catch {
      throw new Error('O campo de atributos precisa estar em JSON válido');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      clearMessages();

      await createListing({
        title: form.title.trim(),
        price: Number(form.price),
        availableQuantity: Number(form.availableQuantity),
        categoryId: form.categoryId.trim(),
        pictureUrl: form.pictureUrl.trim(),
        attributes: parseAttributes()
      });

      setSuccess('Anúncio criado com sucesso');
      resetForm();
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erro ao criar anúncio');
      setErrorDetails(
        err?.response?.data?.details
          ? JSON.stringify(err.response.data.details, null, 2)
          : ''
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      price: item.price ?? '',
      availableQuantity: item.availableQuantity ?? '',
      categoryId: item.categoryId || '',
      pictureUrl: item.pictureUrl || '',
      attributesText: JSON.stringify(item.attributes || [], null, 2)
    });
    clearMessages();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingId) return;

    try {
      setLoading(true);
      clearMessages();

      await updateListing(editingId, {
        title: form.title.trim(),
        price: Number(form.price),
        availableQuantity: Number(form.availableQuantity),
        categoryId: form.categoryId.trim(),
        pictureUrl: form.pictureUrl.trim(),
        attributes: parseAttributes()
      });

      setSuccess('Anúncio atualizado com sucesso');
      resetForm();
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erro ao atualizar anúncio');
      setErrorDetails(
        err?.response?.data?.details
          ? JSON.stringify(err.response.data.details, null, 2)
          : ''
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o anúncio "${title}"?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      clearMessages();

      await deleteListing(id);

      if (editingId === id) {
        resetForm();
      }

      setSuccess('Anúncio excluído com sucesso');
      await loadListings();
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao excluir anúncio');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id) => {
    try {
      setLoading(true);
      clearMessages();

      const { data } = await syncListing(id);
      setSuccess(data?.message || 'Anúncio sincronizado com sucesso');
      await loadListings();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao sincronizar anúncio'
      );
      setErrorDetails(
        err?.response?.data?.details
          ? JSON.stringify(err.response.data.details, null, 2)
          : ''
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async (id) => {
    try {
      setLoading(true);
      clearMessages();

      const { data } = await reconcileListing(id);

      if (data?.differences?.length > 0) {
        setSuccess(`Reconciliação concluída com ${data.differences.length} divergência(s)`);
        setErrorDetails(JSON.stringify(data.differences, null, 2));
      } else {
        setSuccess(data?.message || 'Reconciliação concluída sem divergências');
      }

      await loadListings();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Erro ao reconciliar anúncio'
      );
      setErrorDetails(
        err?.response?.data?.details
          ? JSON.stringify(err.response.data.details, null, 2)
          : ''
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async (id, title) => {
    try {
      setLoading(true);
      clearMessages();

      const { data } = await getListingLogs(id);
      setSelectedLogs(data);
      setSelectedLogTitle(title);
      setShowLogs(true);
    } catch (err) {
      setError('Erro ao carregar logs do anúncio');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectMercadoLivre = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Deseja desconectar a conta do Mercado Livre?');

    if (!confirmed) return;

    try {
      setLoading(true);
      clearMessages();

      await logoutMercadoLivre();
      setSuccess('Conta desconectada com sucesso');
      setAuthInfo({
        connected: false,
        user: null
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        'Erro ao desconectar conta'
      );
    } finally {
      setLoading(false);
    }
  };

  const totalListings = listings.length;
  const syncedCount = listings.filter((item) => item.syncStatus === 'synced').length;
  const pendingCount = listings.filter((item) => item.syncStatus === 'pending').length;
  const conflictCount = listings.filter((item) => item.syncStatus === 'conflict').length;

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#111827' }}>
            Dashboard de Anúncios
          </h1>
          <p style={{ color: '#6b7280' }}>
            Gerencie anúncios locais e sincronize com o Mercado Livre.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          {[
            ['Total de anúncios', totalListings],
            ['Sincronizados', syncedCount],
            ['Pendentes', pendingCount],
            ['Conflitos', conflictCount]
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '1rem 1.2rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
              }}
            >
              <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>{label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#111827' }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            marginBottom: '1.5rem'
          }}
        >
          <h2 style={{ marginTop: 0 }}>Conta Mercado Livre</h2>

          {authInfo.connected ? (
            <div style={{ color: '#374151' }}>
              <p><strong>Status:</strong> Conectado</p>
              <p><strong>Nickname:</strong> {authInfo.user?.nickname || '-'}</p>
              <p><strong>ML User ID:</strong> {authInfo.user?.mlUserId || '-'}</p>
              <p><strong>Email:</strong> {authInfo.user?.email || '-'}</p>

              <button onClick={handleLogout}>
                Desconectar conta
              </button>
            </div>
          ) : (
            <div>
              <p>Status: Não conectado</p>
              <button onClick={handleConnectMercadoLivre}>
                Conectar conta Mercado Livre
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            marginBottom: '1.5rem'
          }}
        >
          <h2 style={{ marginTop: 0 }}>{editingId ? 'Editar anúncio' : 'Criar anúncio'}</h2>

          <form
            onSubmit={editingId ? handleUpdate : handleCreate}
            style={{ display: 'grid', gap: '0.9rem' }}
          >
            <input
              name="title"
              placeholder="Título do anúncio"
              value={form.title}
              onChange={handleChange}
              required
            />
            <input
              name="price"
              type="number"
              placeholder="Preço"
              value={form.price}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
            />
            <input
              name="availableQuantity"
              type="number"
              placeholder="Quantidade em estoque"
              value={form.availableQuantity}
              onChange={handleChange}
              required
              min="0"
            />
            <input
              name="categoryId"
              placeholder="Categoria leaf"
              value={form.categoryId}
              onChange={handleChange}
              required
            />
            <input
              name="pictureUrl"
              placeholder="URL pública da imagem"
              value={form.pictureUrl}
              onChange={handleChange}
              required
            />
            <textarea
              name="attributesText"
              placeholder="Atributos em JSON"
              value={form.attributesText}
              onChange={handleChange}
              rows={10}
              style={{ width: '100%', resize: 'vertical' }}
              required
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">
                {editingId ? 'Salvar alterações' : 'Criar anúncio'}
              </button>

              {editingId && (
                <button type="button" onClick={resetForm}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar por título"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: '220px' }}
            />
            <button onClick={loadListings}>Filtrar</button>
          </div>
        </div>

        {loading && <p>Carregando...</p>}
        {error && <p style={{ color: '#b91c1c', fontWeight: 700 }}>{error}</p>}
        {success && <p style={{ color: '#166534', fontWeight: 700 }}>{success}</p>}

        {errorDetails && (
          <pre
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              color: '#7f1d1d'
            }}
          >
            {errorDetails}
          </pre>
        )}

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            overflowX: 'auto'
          }}
        >
          <table
            cellPadding="12"
            style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: '#6b7280' }}>
                <th>Título</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Status local</th>
                <th>Sync</th>
                <th>Última sync</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {listings.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    Nenhum anúncio encontrado
                  </td>
                </tr>
              ) : (
                listings.map((item) => (
                  <tr key={item._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{item.title}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        {item.mlItemId ? `ML ID: ${item.mlItemId}` : 'Ainda não publicado'}
                      </div>
                    </td>
                    <td>R$ {Number(item.price).toFixed(2)}</td>
                    <td>{item.availableQuantity}</td>
                    <td>{item.status}</td>
                    <td>
                      <span style={badgeStyle(item.syncStatus)}>
                        {item.syncStatus}
                      </span>
                    </td>
                    <td>
                      {item.lastSyncedAt
                        ? new Date(item.lastSyncedAt).toLocaleString('pt-BR')
                        : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handleEdit(item)}>Editar</button>
                        <button onClick={() => handleSync(item._id)}>Sincronizar</button>
                        <button onClick={() => handleReconcile(item._id)}>Reconciliar</button>
                        <button onClick={() => handleViewLogs(item._id, item.title)}>Logs</button>
                        <button onClick={() => handleDelete(item._id, item.title)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showLogs && (
          <div
            style={{
              marginTop: '1.5rem',
              background: '#fff',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <h2 style={{ marginTop: 0 }}>Logs: {selectedLogTitle}</h2>
              <button onClick={() => setShowLogs(false)}>Fechar</button>
            </div>

            {selectedLogs.length === 0 ? (
              <p>Nenhum log encontrado.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {selectedLogs.map((log) => (
                  <div
                    key={log._id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '0.9rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      <strong>{log.action}</strong>
                      <span style={badgeStyle(log.status)}>{log.status}</span>
                      <span style={{ color: '#6b7280' }}>
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div style={{ color: '#374151' }}>{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
