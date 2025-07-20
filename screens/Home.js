import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ScrollView, Linking, Image, Dimensions, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../core/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, apiFetch } from '../core/api';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width, height } = Dimensions.get('window');

// Colores optimizados para gel capilar
const COLORS = {
  primary: '#2E7D32',      // Verde aloe vera
  secondary: '#FF6B35',    // Naranja para CTAs
  accent: '#4CAF50',       // Verde claro
  success: '#66BB6A',
  warning: '#FF9800',
  error: '#F44336',
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    shadow: '#000000',
  },
  dark: {
    background: '#0A0A0A',
    surface: '#1A1A1A',
    card: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#404040',
    shadow: '#000000',
  }
};

const Home = () => {
  const { accessToken } = useAuth();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = COLORS[isDark ? 'dark' : 'light'];

  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBenefit, setExpandedBenefit] = useState(null); // New state for expanded benefit

  useEffect(() => {
    if (accessToken) {
      console.log("Access Token en Home:", accessToken);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchCartCount();
      const interval = setInterval(fetchCartCount, 15000);
      return () => clearInterval(interval);
    }
  }, [accessToken]);

  const fetchCartCount = async () => {
    try {
      const { data, ok } = await apiFetch('/store/cart', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (ok && data && data.cart_products) {
        const total = data.cart_products.reduce((sum, item) => sum + item.quantity, 0);
        setCartCount(total);
      } else {
        setCartCount(0);
      }
    } catch (err) {
      setCartCount(0);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/store/products`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error('Error al obtener productos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openSocialLink = (url) => {
    Linking.openURL(url).catch(err => console.error('Error al abrir enlace:', err));
  };

  const addToCart = async (productId) => {
    try {
      await apiFetch('/store/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      fetchCartCount();
    } catch (err) {
      console.error('Error al agregar al carrito:', err);
    }
  };

  // Toggle benefit expansion
  const toggleBenefitExpansion = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedBenefit(expandedBenefit === index ? null : index);
  };

  const renderProduct = (product, index) => (
      <View key={product.id} style={[
        styles.productCard,
        {
          backgroundColor: theme.card,
          shadowColor: theme.shadow,
          borderColor: theme.border,
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        {/* Badge de stock bajo */}
        {product.stock <= 5 && product.stock > 0 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>¡Solo quedan {product.stock}!</Text>
            </View>
        )}

        {/* Imagen del producto */}
        <View style={styles.productImageContainer}>
          {product.image_url ? (
              <Image
                  source={{ uri: product.image_url }}
                  style={styles.productImage}
                  resizeMode="cover"
              />
          ) : (
              <View style={[styles.productImagePlaceholder, { backgroundColor: theme.background }]}>
                <Ionicons name="water" size={60} color={COLORS.primary} />
              </View>
          )}

          {/* Botón de favorito */}
          <TouchableOpacity style={styles.favoriteBtn} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Información del producto */}
        <View style={styles.productContent}>
          <Text style={[styles.productTitle, { color: theme.text }]} numberOfLines={2}>
            {product.title}
          </Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1,2,3,4,5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color={COLORS.accent} />
              ))}
            </View>
            <Text style={[styles.ratingText, { color: theme.textSecondary }]}>(4.8)</Text>
          </View>

          <Text style={[styles.productDescription, { color: theme.textSecondary }]} numberOfLines={3}>
            {product.description}
          </Text>

          {/* Precio y stock */}
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: theme.text }]}>
                Bs{product.price}
              </Text>
              <Text style={[styles.stockText, {
                color: product.stock > 10 ? COLORS.success :
                    product.stock > 0 ? COLORS.warning : COLORS.error
              }]}>
                {product.stock > 10 ? 'Disponible' :
                    product.stock > 0 ? `Solo ${product.stock}` : 'Agotado'}
              </Text>
            </View>

            {/* Botón de agregar al carrito */}
            <TouchableOpacity
                style={[
                  styles.addButton,
                  {
                    backgroundColor: product.stock > 0 ? COLORS.secondary : theme.border,
                    opacity: product.stock > 0 ? 1 : 0.5
                  }
                ]}
                onPress={() => addToCart(product.id)}
                disabled={product.stock <= 0}
                activeOpacity={0.8}
            >
              <Ionicons
                  name={product.stock > 0 ? "add" : "close"}
                  size={24}
                  color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
  );

  const benefitsData = [
    {
      icon: 'water',
      title: 'Hidratación Profunda',
      desc: 'Cabello suave y sedoso desde la primera aplicación. Mantiene la humedad natural del cuero cabelludo y el cabello, evitando la sequedad y el frizz.',
      shortDesc: 'Cabello suave y sedoso',
      color: COLORS.primary
    },
    {
      icon: 'shield-checkmark',
      title: 'Protección Natural',
      desc: 'Crea una barrera protectora contra los daños ambientales, el calor de herramientas de estilizado y la contaminación. Fortalece la hebra capilar.',
      shortDesc: 'Contra daño ambiental',
      color: COLORS.success
    },
    {
      icon: 'flash',
      title: 'Fortalecimiento Capilar',
      desc: 'Nutre el folículo piloso, reduciendo la caída del cabello y promoviendo un crecimiento más fuerte y saludable. Repara el cabello dañado.',
      shortDesc: 'Desde la raíz',
      color: COLORS.secondary
    },
    {
      icon: 'sparkles',
      title: 'Brillo y Vitalidad',
      desc: 'Devuelve el brillo natural a tu cabello sin dejar residuos grasos. Mejora la elasticidad y la apariencia general para un look radiante.',
      shortDesc: 'Sin químicos agresivos',
      color: COLORS.accent
    },
  ];

  return (
      <View style={{ flex: 1 }}>
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
        >
          {/* Header simplificado */}
          <View style={[styles.header, { backgroundColor: theme.surface }]}>
            <View style={styles.logoSection}>
              <View style={[styles.logoIcon, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="leaf" size={28} color="#FFF" />
              </View>
              <View>
                <Text style={[styles.logoText, { color: theme.text }]}>EcoStylo</Text>
                <Text style={[styles.logoSubtext, { color: theme.textSecondary }]}>Gel Capilar Natural</Text>
              </View>
            </View>
          </View>

          {/* Hero específico para gel capilar */}
          <View style={styles.heroSection}>
            <View style={[styles.heroCard, { backgroundColor: COLORS.primary }]}>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>
                  Cabello{'\n'}
                  <Text style={{
                    color: COLORS.accent,
                    textShadowColor: '#FFFFFF',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 0,
                  }}>
                    Saludable y Natural
                  </Text>
                </Text>
                <Text style={styles.heroSubtitle}>
                  Gel capilar con aloe vera 100% natural{'\n'}
                  para un cabello fuerte y brillante
                </Text>

                <TouchableOpacity
                    style={[styles.heroButton, { backgroundColor: COLORS.secondary }]}
                    activeOpacity={0.8}
                >
                  <Text style={styles.heroButtonText}>VER PRODUCTOS</Text>
                  <Ionicons name="arrow-down" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Stats específicos */}
              <View style={styles.heroStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>500+</Text>
                  <Text style={styles.statLabel}>Clientes</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>4.9★</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>Aloe Vera</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Beneficios específicos para gel capilar */}
          <View style={styles.benefitsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Beneficios del Aloe Vera
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.benefitsScroll}
            >
              {benefitsData.map((benefit, index) => (
                  <TouchableOpacity
                      key={index}
                      style={[
                        styles.benefitCard,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                          borderColor: benefit.color,
                          borderWidth: 2,
                        },
                        expandedBenefit === index && styles.expandedBenefitCard // Apply expanded style
                      ]}
                      onPress={() => toggleBenefitExpansion(index)}
                      activeOpacity={0.8}
                  >
                    <View style={[styles.benefitIcon, { backgroundColor: benefit.color }]}>
                      <Ionicons name={benefit.icon} size={28} color="#FFF" />
                    </View>
                    <Text style={[styles.benefitTitle, { color: theme.text }]}>
                      {benefit.title}
                    </Text>
                    <Text
                        style={[styles.benefitDesc, { color: theme.textSecondary }]}
                        numberOfLines={expandedBenefit === index ? 0 : 2} // Show all lines when expanded
                    >
                      {expandedBenefit === index ? benefit.desc : benefit.shortDesc}
                    </Text>
                    {expandedBenefit !== index && (
                        <Text style={[styles.readMoreText, {color: COLORS.secondary}]}>
                          Ver más...
                        </Text>
                    )}
                    {expandedBenefit === index && (
                        <Text style={[styles.readMoreText, {color: COLORS.secondary}]}>
                          Ver menos
                        </Text>
                    )}
                  </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Productos */}
          <View style={styles.productsSection}>
            <View style={styles.productsHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Nuestros Geles Capilares
              </Text>
              <View style={[styles.productsBadge, { backgroundColor: COLORS.primary }]}>
                <Text style={styles.productsBadgeText}>{products.length}</Text>
              </View>
            </View>

            {loading ? (
                <View style={styles.loadingState}>
                  <View style={[styles.loadingSpinner, { backgroundColor: COLORS.primary }]}>
                    <Ionicons name="refresh" size={32} color="#FFF" />
                  </View>
                  <Text style={[styles.loadingText, { color: theme.text }]}>
                    Cargando productos...
                  </Text>
                </View>
            ) : error ? (
                <View style={styles.errorState}>
                  <Ionicons name="alert-circle" size={60} color={COLORS.error} />
                  <Text style={[styles.errorText, { color: theme.text }]}>
                    Error al cargar productos
                  </Text>
                  <TouchableOpacity
                      style={[styles.retryBtn, { backgroundColor: COLORS.primary }]}
                      onPress={fetchProducts}
                      activeOpacity={0.8}
                  >
                    <Text style={styles.retryBtnText}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.productsContainer}>
                  {products.map(renderProduct)}
                </View>
            )}
          </View>

          {/* Testimonios específicos */}
          <View style={styles.testimonialsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Cabello Transformado
            </Text>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.testimonialsScroll}
            >
              {[
                { name: 'María G.', text: 'Mi cabello nunca se había visto tan saludable y brillante', avatar: '👩🏻' },
                { name: 'Ana R.', text: 'El aloe vera realmente funciona, cabello súper suave', avatar: '👩🏽' },
                { name: 'Carmen L.', text: 'Natural y efectivo, mi cabello está más fuerte', avatar: '👩🏻‍🦱' },
              ].map((testimonial, index) => (
                  <View key={index} style={[
                    styles.testimonialCard,
                    { backgroundColor: theme.surface, borderColor: theme.border }
                  ]}>
                    <View style={styles.testimonialHeader}>
                      <Text style={styles.avatar}>{testimonial.avatar}</Text>
                      <View>
                        <Text style={[styles.testimonialName, { color: theme.text }]}>
                          {testimonial.name}
                        </Text>
                        <View style={styles.testimonialStars}>
                          {[1,2,3,4,5].map((star) => (
                              <Ionicons key={star} name="star" size={14} color={COLORS.accent} />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.testimonialText, { color: theme.textSecondary }]}>
                      "{testimonial.text}"
                    </Text>
                  </View>
              ))}
            </ScrollView>
          </View>

          {/* Redes sociales mejoradas */}
          <View style={styles.socialSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Síguenos para tips de cuidado capilar
            </Text>

            <View style={styles.socialContainer}>
              <TouchableOpacity
                  style={[styles.socialButton, styles.instagramBtn]}
                  onPress={() => openSocialLink('https://www.instagram.com/GelNatAloeVera123')}
                  activeOpacity={0.8}
              >
                <Ionicons name="logo-instagram" size={20} color="#FFF" />
                <Text style={styles.socialText}>Instagram</Text>
                <Text style={styles.socialSubtext}>@GelNatAloeVera123</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.socialButton, styles.tiktokBtn]}
                  onPress={() => openSocialLink('https://www.tiktok.com/@grupoaloevera7')}
                  activeOpacity={0.8}
              >
                <Ionicons name="logo-tiktok" size={20} color="#FFF" />
                <Text style={styles.socialText}>TikTok</Text>
                <Text style={styles.socialSubtext}>@grupoaloevera7</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.socialButton, styles.facebookBtn]}
                  onPress={() => openSocialLink('https://www.facebook.com/share/1CXBfmbzVZ/?mibextid=wwXIfr')}
                  activeOpacity={0.8}
              >
                <Ionicons name="logo-facebook" size={20} color="#FFF" />
                <Text style={styles.socialText}>Facebook</Text>
                <Text style={styles.socialSubtext}>EcoStylo Oficial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.socialButton, styles.linktreeBtn]}
                  onPress={() => openSocialLink('https://linktr.ee/TESLAQUINCE')}
                  activeOpacity={0.8}
              >
                <Ionicons name="link" size={20} color="#FFF" />
                <Text style={styles.socialText}>Más Enlaces</Text>
                <Text style={styles.socialSubtext}>Todos nuestros links</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* FAB del carrito */}
        {cartCount > 0 && (
            <TouchableOpacity
                style={[
                  styles.cartFab,
                  {
                    backgroundColor: COLORS.secondary,
                    shadowColor: COLORS.secondary,
                  }
                ]}
                onPress={() => navigation.navigate('Cart')}
                activeOpacity={0.8}
            >
              <Ionicons name="bag" size={28} color="#FFF" />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            </TouchableOpacity>
        )}
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Header simplificado
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoSubtext: {
    fontSize: 12,
    marginTop: -2,
  },

  // Hero específico
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 280,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    lineHeight: 42,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    lineHeight: 24,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignSelf: 'flex-start',
    minWidth: 200,
  },
  heroButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Beneficios
  benefitsSection: {
    paddingVertical: 20,
  },
  benefitsScroll: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  benefitCard: {
    width: 160, // Fixed width for all cards
    height: 200, // Fixed height for non-expanded cards
    alignItems: 'center',
    justifyContent: 'space-between', // Distribute space
    padding: 20,
    borderRadius: 16,
    marginRight: 16,
    position: 'relative', // For "Ver más" text positioning
  },
  expandedBenefitCard: {
    height: 'auto', // Allow height to expand
    minHeight: 240, // Minimum height when expanded
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  benefitDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    flexGrow: 1, // Allow description to take up available space
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },

  // Productos
  productsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  productsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  productsBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  productsContainer: {
    // Una sola columna
  },
  productCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  stockBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 1,
  },
  stockBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productImageContainer: {
    height: 200,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    padding: 20,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },

  // Estados
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    marginVertical: 20,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Testimonios
  testimonialsSection: {
    paddingVertical: 20,
  },
  testimonialsScroll: {
    paddingHorizontal: 20,
    paddingRight: 40,
  },
  testimonialCard: {
    width: 280,
    padding: 20,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 32,
    marginRight: 12,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testimonialStars: {
    flexDirection: 'row',
  },
  testimonialText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Redes sociales mejoradas
  socialSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  socialContainer: {
    marginTop: 16,
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
  },
  instagramBtn: {
    backgroundColor: '#E4405F',
  },
  tiktokBtn: {
    backgroundColor: '#000000',
  },
  facebookBtn: {
    backgroundColor: '#1877F2',
  },
  linktreeBtn: {
    backgroundColor: '#00C851',
  },
  socialText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  socialSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },

  // Títulos
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 20,
  },

  // FAB
  cartFab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  cartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Home;