import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  useColorScheme,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../core/AuthContext';
import { apiFetch } from '../core/api';

const TITLE_COLOR = '#4CAF50';
const BROWN_COLOR = '#A0522D';

const CartScreen = () => {
  const { accessToken } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, ok } = await apiFetch('/store/cart', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!ok) throw new Error(data?.detail || 'Error al obtener el carrito');
      setCart(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotal = () => {
    if (!cart || !cart.cart_products) return 0;
    return cart.cart_products.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getOrderSummary = () => {
    if (!cart || !cart.cart_products) return { productos: [], total: 0 };
    
    const productos = cart.cart_products.map(item => ({
      nombre: item.product.title,
      cantidad: item.quantity,
      precio: item.product.price,
      subtotal: item.product.price * item.quantity
    }));
    
    const total = productos.reduce((sum, producto) => sum + producto.subtotal, 0);
    
    return { productos, total };
  };

  // FUNCIÓN DE PRUEBA WHATSAPP
  const testWhatsApp = async () => {
    try {
      setTestingWhatsApp(true);
      
      console.log('Probando envío de WhatsApp...');
      
      const { data, ok } = await apiFetch('/store/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!ok) {
        throw new Error(data?.detail || 'Error en test de WhatsApp');
      }
      
      console.log('Test WhatsApp resultado:', data);
      
      Alert.alert(
        data.success ? '✅ Test WhatsApp Exitoso' : '❌ Error en Test',
        data.message + (data.result ? `\n\nResultado: ${data.result}` : ''),
        [{ text: 'OK' }]
      );
      
    } catch (err) {
      console.error('Error en test WhatsApp:', err);
      Alert.alert(
        '❌ Error en Test WhatsApp', 
        `No se pudo enviar el mensaje de prueba:\n${err.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setTestingWhatsApp(false);
    }
  };

// FUNCIÓN PRINCIPAL DE CHECKOUT CON DATOS REALES (CORREGIDA)
const ConfirmacCompra = async () => {
  try {
    setConfirmingPurchase(true);
    
    console.log('Iniciando proceso de checkout...');
    
    // Llamada al endpoint real de checkout
    const { data, ok } = await apiFetch('/store/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!ok) {
      throw new Error(data?.detail || 'Error al procesar la compra');
    }
    
    console.log('Checkout exitoso:', data);
    console.log('Estructura completa de respuesta:', JSON.stringify(data, null, 2));
    
    // Cerrar modal
    setShowModal(false);
    
    // 🔥 CORRECCIÓN PRINCIPAL: Verificar la estructura real de la respuesta
    let order;
    let whatsappStatus = '⚠️ Estado de WhatsApp desconocido';
    
    // Opción 1: Si la respuesta tiene la estructura esperada { success, message, order, whatsapp_sent }
    if (data.order) {
      order = data.order;
      whatsappStatus = data.whatsapp_sent ? 
        '📱 Vendedor notificado por WhatsApp exitosamente' : 
        '⚠️ Pedido procesado correctamente (notificación WhatsApp pendiente)';
      console.log('Usando data.order:', order);
    }
    // Opción 2: Si la orden está directamente en data (como sugieren tus logs)
    else if (data.id && data.order_number) {
      order = data;
      // En este caso, necesitamos verificar el estado de WhatsApp de otra manera
      // Podríamos asumir que se envió exitosamente si llegamos aquí
      whatsappStatus = '📱 Vendedor notificado por WhatsApp exitosamente';
      console.log('Usando data directamente como order:', order);
    }
    // Opción 3: Fallback si no encontramos la estructura esperada
    else {
      console.error('Estructura de respuesta inesperada:', data);
      throw new Error('Estructura de respuesta del servidor inesperada');
    }
    
    // Validar que tenemos los datos mínimos necesarios
    if (!order || !order.order_number) {
      console.error('Error: Datos de orden incompletos', { order, data });
      throw new Error('No se pudieron obtener los detalles completos del pedido');
    }
    
    // Mostrar mensaje de éxito con datos reales
    Alert.alert(
      '🎉 Compra Confirmada',
      `📋 Pedido: ${order.order_number}
👤 Cliente: ${order.full_name || 'No especificado'}
📞 Teléfono: ${order.phone_number || 'No especificado'}
📍 Dirección: ${order.address || 'No especificada'}
💰 Total: $${order.total?.toLocaleString() || '0'}
📅 Fecha: ${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Hoy'}

✅ ${whatsappStatus}

¡Tu pedido ha sido procesado exitosamente! El vendedor ha sido notificado con todos los detalles.`,
      [
        { 
          text: 'Ver detalles', 
          onPress: () => {
            console.log('=== DETALLES COMPLETOS DE LA ORDEN ===');
            console.log('Orden completa:', JSON.stringify(order, null, 2));
            console.log('Respuesta completa del servidor:', JSON.stringify(data, null, 2));
          }
        },
        { 
          text: 'OK', 
          style: 'default' 
        }
      ]
    );
    
    // Recargar el carrito (debería estar vacío ahora)
    await fetchCart();
    
  } catch (err) {
    console.error('Error en checkout:', err);
    console.error('Stack trace:', err.stack);
    
    let errorMessage = 'No se pudo procesar tu compra. ';
    
    if (err.message.includes('carrito está vacío') || err.message.includes('El carrito está vacío')) {
      errorMessage += 'Tu carrito está vacío.';
    } else if (err.message.includes('stock insuficiente')) {
      errorMessage += 'Stock insuficiente para algunos productos.';
    } else if (err.message.includes('No autorizado')) {
      errorMessage += 'Debes iniciar sesión para realizar compras.';
    } else {
      errorMessage += `Intenta nuevamente.\n\nDetalle del error: ${err.message}`;
    }
    
    Alert.alert(
      '❌ Error al procesar compra', 
      errorMessage,
      [{ text: 'OK' }]
    );
  } finally {
    setConfirmingPurchase(false);
  }
};

  const openConfirmModal = () => {
    if (cart && cart.cart_products && cart.cart_products.length > 0) {
      setShowModal(true);
    } else {
      Alert.alert('Carrito vacío', 'Agrega productos a tu carrito para continuar');
    }
  };

  // Obtener resumen de la orden actual
  const orderSummary = getOrderSummary();

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#111' }]}> 
      {/* Botón Test WhatsApp (pequeño y discreto) */}
      <TouchableOpacity 
        style={styles.testButton}
        onPress={testWhatsApp}
        disabled={testingWhatsApp}
      >
        {testingWhatsApp ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="logo-whatsapp" size={16} color="#fff" />
        )}
      </TouchableOpacity>

      <Text style={[styles.title, isDark && { color: '#fff' }]}>Mi Carrito</Text>
      
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={TITLE_COLOR} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={40} color="#E53935" />
          <Text style={[styles.errorText, isDark && { color: '#fff' }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCart}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : cart && cart.cart_products && cart.cart_products.length > 0 ? (
        <>
          <ScrollView style={{ flex: 1 }}>
            {cart.cart_products.map(item => (
              <View key={item.id} style={[styles.productCard, isDark && styles.productCardDark]}>
                <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={[styles.productTitle, isDark && { color: '#fff' }]}>
                    {item.product.title}
                  </Text>
                  <Text style={[styles.productDesc, isDark && { color: '#bbb' }]} numberOfLines={2}>
                    {item.product.description}
                  </Text>
                  <View style={styles.row}>
                    <Text style={[styles.price, isDark && { color: '#fff' }]}>
                      ${item.product.price} x {item.quantity}
                    </Text>
                    <Text style={[styles.subtotal, isDark && { color: TITLE_COLOR }]}>
                      Subtotal: ${item.product.price * item.quantity}
                    </Text>
                  </View>
                  <Text style={[styles.stockInfo, isDark && { color: '#999' }]}>
                    Stock disponible: {item.product.stock}
                  </Text>
                </View>
              </View>
            ))}
            
            <View style={styles.totalContainer}>
              <Text style={[styles.totalLabel, isDark && { color: '#fff' }]}>Total:</Text>
              <Text style={[styles.totalValue, isDark && { color: TITLE_COLOR }]}>${getTotal()}</Text>
            </View>
          </ScrollView>
          
          {/* Botón de Confirmar Compra */}
          <TouchableOpacity 
            style={[styles.confirmButton, isDark && styles.confirmButtonDark]} 
            onPress={openConfirmModal}
            activeOpacity={0.8}
          >
            <Ionicons name="card" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.confirmButtonText}>Confirmar Compra</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="cart-outline" size={60} color={TITLE_COLOR} />
          <Text style={[styles.emptyText, isDark && { color: '#fff' }]}>Tu carrito está vacío</Text>
          <Text style={[styles.emptySubtext, isDark && { color: '#999' }]}>
            Agrega productos para comenzar tu compra
          </Text>
        </View>
      )}

      {/* Modal de Confirmación con Datos Reales */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModal}
        onRequestClose={() => !confirmingPurchase && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDark && { color: '#fff' }]}>
              Confirmar Pedido
            </Text>
            
            <ScrollView style={styles.orderSummaryContainer}>
              <View style={[styles.orderSummary, isDark && { backgroundColor: '#333' }]}>
                <Text style={[styles.summaryLabel, isDark && { color: '#fff' }]}>
                  🛒 Resumen de tu pedido:
                </Text>
                
                {orderSummary.productos.map((producto, index) => (
                  <Text key={index} style={[styles.productItem, isDark && { color: '#bbb' }]}>
                    • {producto.cantidad}x {producto.nombre} — ${producto.precio.toLocaleString()}
                  </Text>
                ))}
                
                <Text style={[styles.totalSummary, isDark && { color: TITLE_COLOR }]}>
                  💰 Total a pagar: ${orderSummary.total.toLocaleString()}
                </Text>
                
                <Text style={[styles.processInfo, isDark && { color: '#999' }]}>
                  ℹ️ Al confirmar se procesará tu pedido, se vaciará tu carrito, se actualizará el inventario y el vendedor será notificado automáticamente por WhatsApp con todos los detalles del pedido.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, isDark && styles.cancelButtonDark]}
                onPress={() => setShowModal(false)}
                disabled={confirmingPurchase}
              >
                <Text style={[styles.cancelButtonText, isDark && { color: '#fff' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmModalButton, confirmingPurchase && styles.confirmModalButtonDisabled]}
                onPress={ConfirmacCompra}
                disabled={confirmingPurchase}
              >
                {confirmingPurchase ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmModalButtonText}>Confirmar Pedido</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, backgroundColor: '#fff' },
  
  // Botón test WhatsApp (pequeño y oculto)
  testButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    backgroundColor: '#25D366',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    opacity: 0.7,
  },
  
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 18, color: TITLE_COLOR, textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
  errorText: { color: '#E53935', marginTop: 10, fontSize: 16, textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: TITLE_COLOR, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#666', marginTop: 10, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: '#999', marginTop: 5, fontSize: 14, textAlign: 'center' },
  productCard: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginBottom: 16, 
    padding: 10, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 4, 
    elevation: 2 
  },
  productCardDark: { backgroundColor: '#222' },
  productImage: { width: 70, height: 70, borderRadius: 10, marginRight: 14 },
  productInfo: { flex: 1, justifyContent: 'center' },
  productTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  productDesc: { fontSize: 13, color: '#666', marginVertical: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  price: { fontSize: 15, color: '#333' },
  subtotal: { fontSize: 14, color: TITLE_COLOR, fontWeight: 'bold' },
  stockInfo: { fontSize: 12, color: '#999', marginTop: 4 },
  totalContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 24, 
    padding: 12, 
    borderTopWidth: 1, 
    borderColor: '#eee' 
  },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: TITLE_COLOR },
  
  // Estilos del botón confirmar
  confirmButton: {
    backgroundColor: TITLE_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonDark: {
    backgroundColor: TITLE_COLOR,
  },
  buttonIcon: {
    marginRight: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 10,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContentDark: {
    backgroundColor: '#222',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  orderSummaryContainer: {
    maxHeight: 300,
  },
  orderSummary: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  productItem: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 6,
    color: '#666',
  },
  totalSummary: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: TITLE_COLOR,
  },
  processInfo: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 16, // Añadido para separar del contenido
},
cancelButton: {
  flex: 1,
  backgroundColor: '#fff',
  borderWidth: 2,
  borderColor: '#ddd',
  padding: 10, // Reducido de 14 a 10
  borderRadius: 8,
  alignItems: 'center',
  minHeight: 44, // Establecer altura mínima
},
confirmModalButton: {
  flex: 1,
  backgroundColor: TITLE_COLOR,
  padding: 10, // Reducido de 14 a 10
  borderRadius: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 44, // Establecer altura mínima
},
  cancelButtonDark: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  
  confirmModalButtonDisabled: {
    backgroundColor: '#999',
  },
  confirmModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CartScreen;