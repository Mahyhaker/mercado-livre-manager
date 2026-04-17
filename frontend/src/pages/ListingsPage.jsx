import { useEffect, useState, useCallback } from 'react';
import {
  getListings,
  createListing,
  updateListing,
  deleteListing,
  syncListing
} from '../api/listingsApi';
import { getMe, getLoginUrl } from '../api/authApi';

const initialForm = {
  title: '',
  price: '',
  availableQuantity: '',
  categoryId: '',
  pictureUrl: '',
  attributesText: `[
  { "id": "BRAND", "value_name": "Dell" },
  { "id": "MODEL", "value_name": "Inspiron 15" },
  { "id": "COLOR", "value_name": "Preto" },
  { "id": "MANUFACTURER", "value_name": "Dell" },
  { "id": "CARRIER", "value_name": "Desbloqueado" },
  { "id": "IS_DUAL_SIM", "value_name": "Não" },
  { "id": "ALPHANUMERIC_MODELS", "value_name": "Inspiron15" },
  { "id": "CELLPHONES_ANATEL_HOMOLOGATION_NUMBER", "value_name": "123456789" }
]`
};

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
      setErrorDetails('');
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
    } catch (error) {
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
      console.error(err);
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
      console.error(err);
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
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o anúncio "${title}"?`
    );

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
      console.error(err);
      setError(err?.response?.data?.message || 'Erro ao excluir anúncio');
      setErrorDetails(
        err?.response?.data?.details
          ? JSON.stringify(err.response.data.details, null, 2)
          : ''
      );
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
      console.error(err);

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

  const handleConnectMercadoLivre = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Gerenciador de Anúncios</h1>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          border: '1px solid #ccc',
          borderRadius: '8px',
          backgroundColor: '#fff'
        }}
      >
        <h2>Conta Mercado Livre</h2>

        {authInfo.connected ? (
          <div>
            <p><strong>Status:</strong> Conectado</p>
            <p><strong>Nickname:</strong> {authInfo.user?.nickname || '-'}</p>
            <p><strong>ML User ID:</strong> {authInfo.user?.mlUserId || '-'}</p>
            <p><strong>Email:</strong> {authInfo.user?.email || '-'}</p>
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
          marginBottom: '2rem',
          padding: '1.5rem',
          border: '1px solid #ccc',
          borderRadius: '8px',
          backgroundColor: '#fff'
        }}
      >
        <h2>{editingId ? 'Editar anúncio' : 'Criar anúncio'}</h2>

        <form
          onSubmit={editingId ? handleUpdate : handleCreate}
          style={{ display: 'grid', gap: '1rem' }}
        >
          <input
            type="text"
            name="title"
            placeholder="Título do anúncio"
            value={form.title}
            onChange={handleChange}
            required
          />

          <input
            type="number"
            name="price"
            placeholder="Preço"
            value={form.price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
          />

          <input
            type="number"
            name="availableQuantity"
            placeholder="Quantidade em estoque"
            value={form.availableQuantity}
            onChange={handleChange}
            required
            min="0"
          />

          <input
            type="text"
            name="categoryId"
            placeholder="Categoria leaf"
            value={form.categoryId}
            onChange={handleChange}
            required
          />

          <input
            type="text"
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
            rows={12}
            style={{ width: '100%' }}
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
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}
      >
        <input
          placeholder="Buscar por título"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={loadListings}>Filtrar</button>
      </div>

      {loading && <p>Carregando...</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
      {errorDetails && (
        <pre
          style={{
            background: '#fff3f3',
            color: '#900',
            border: '1px solid #f0b4b4',
            padding: '1rem',
            borderRadius: '8px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}
        >
          {errorDetails}
        </pre>
      )}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <div style={{ overflowX: 'auto' }}>
        <table
          border="1"
          cellPadding="10"
          style={{
            marginTop: '1rem',
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#fff'
          }}
        >
          <thead>
            <tr>
              <th>Título</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Sincronização</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listings.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>
                  Nenhum anúncio encontrado
                </td>
              </tr>
            ) : (
              listings.map((item) => (
                <tr key={item._id}>
                  <td>{item.title}</td>
                  <td>R$ {Number(item.price).toFixed(2)}</td>
                  <td>{item.availableQuantity}</td>
                  <td>{item.status}</td>
                  <td>{item.syncStatus}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button onClick={() => handleEdit(item)}>Editar</button>
                      <button onClick={() => handleSync(item._id)}>
                        Sincronizar
                      </button>
                      <button onClick={() => handleDelete(item._id, item.title)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}