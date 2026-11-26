// GENERADO por tools/build-icon-sprite.mjs — no editar a mano.
// La fuente de verdad es icons.json. Regenerar con: npm run icons

/** Nombres del set curado. Un icono fuera de esta lista no compila. */
export type NpIconName =
  | 'airplane'
  | 'archive'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrows-clockwise'
  | 'baby'
  | 'balloon'
  | 'bank'
  | 'bed'
  | 'bell'
  | 'book-open'
  | 'briefcase'
  | 'bus'
  | 'cake'
  | 'calendar'
  | 'calendar-check'
  | 'camera'
  | 'car'
  | 'car-simple'
  | 'caret-down'
  | 'caret-left'
  | 'caret-right'
  | 'caret-up'
  | 'caret-up-down'
  | 'champagne'
  | 'chart-bar'
  | 'chart-pie-slice'
  | 'chat-circle-text'
  | 'check'
  | 'check-circle'
  | 'chef-hat'
  | 'church'
  | 'circle-dashed'
  | 'clock'
  | 'clock-countdown'
  | 'confetti'
  | 'copy'
  | 'cow'
  | 'credit-card'
  | 'crown-simple'
  | 'currency-eur'
  | 'cursor-click'
  | 'desktop'
  | 'device-mobile'
  | 'diamond'
  | 'disco-ball'
  | 'door-open'
  | 'dots-six-vertical'
  | 'dots-three'
  | 'download-simple'
  | 'dress'
  | 'envelope'
  | 'eye'
  | 'eye-slash'
  | 'file-text'
  | 'first-aid'
  | 'fish'
  | 'flag-checkered'
  | 'flower'
  | 'fork-knife'
  | 'funnel'
  | 'game-controller'
  | 'gear'
  | 'gift'
  | 'grains'
  | 'guitar'
  | 'hand-coins'
  | 'hand-heart'
  | 'hands-clapping'
  | 'heart'
  | 'images'
  | 'info'
  | 'layout'
  | 'leaf'
  | 'link-simple'
  | 'list'
  | 'list-checks'
  | 'lock-open'
  | 'lock-simple'
  | 'magic-wand'
  | 'magnifying-glass'
  | 'map-pin'
  | 'martini'
  | 'microphone-stage'
  | 'money'
  | 'moon-stars'
  | 'music-notes'
  | 'navigation-arrow'
  | 'note-pencil'
  | 'paint-brush'
  | 'palette'
  | 'pencil-simple'
  | 'person-simple-walk'
  | 'plant'
  | 'playlist'
  | 'plus'
  | 'prohibit'
  | 'question'
  | 'rocket'
  | 'seal-check'
  | 'seat'
  | 'share-network'
  | 'shield-check'
  | 'sign-out'
  | 'sliders-horizontal'
  | 'sparkle'
  | 'spinner-gap'
  | 'star'
  | 'steering-wheel'
  | 'storefront'
  | 'suitcase'
  | 'sun'
  | 't-shirt'
  | 'table'
  | 'taxi'
  | 'tent'
  | 'train'
  | 'trash'
  | 'trophy'
  | 'upload-simple'
  | 'user'
  | 'user-circle'
  | 'user-plus'
  | 'users'
  | 'users-three'
  | 'video-camera'
  | 'warning'
  | 'whatsapp-logo'
  | 'wheelchair'
  | 'wine'
  | 'x'
  | 'x-circle';

/** Peso como mecanismo de estado: regular inactivo, fill activo. */
export type NpIconWeight = 'regular' | 'fill';

/** Etiqueta por defecto de cada icono, para lectores de pantalla y selectores. */
export const NP_ICON_LABELS: Record<NpIconName, string> = {
  'church': "Ceremonia",
  'champagne': "Brindis",
  'fork-knife': "Banquete",
  'cake': "Tarta",
  'disco-ball': "Baile",
  'music-notes': "Música",
  'confetti': "Fiesta",
  'balloon': "Globos",
  'flower': "Flores",
  'camera': "Fotos",
  'video-camera': "Vídeo",
  'moon-stars': "Recena",
  'sun': "Exterior",
  'tent': "Carpa",
  'martini': "Cóctel",
  'microphone-stage': "Discursos",
  'users-three': "Llegada de invitados",
  'hands-clapping': "Aplausos",
  'door-open': "Entrada",
  'sparkle': "Primer baile",
  'person-simple-walk': "Llegada",
  'flag-checkered': "Final",
  'guitar': "Música en directo",
  'suitcase': "Viaje de novios",
  'bus': "Autobús",
  'car': "Coche",
  'taxi': "Taxi",
  'train': "Tren",
  'airplane': "Avión",
  'car-simple': "Parking",
  'bed': "Alojamiento",
  'map-pin': "Ubicación",
  'navigation-arrow': "Cómo llegar",
  'wheelchair': "Accesibilidad",
  'clock': "Hora",
  'calendar': "Fecha",
  'users': "Grupo",
  'user': "Invitado",
  'user-plus': "Acompañante",
  'baby': "Niños",
  'heart': "Pareja",
  'diamond': "Anillos",
  'dress': "Vestido",
  't-shirt': "Dress code",
  'crown-simple': "Padrinos",
  'hand-heart': "Testigos",
  'steering-wheel': "Chófer",
  'user-circle': "Quién eres",
  'leaf': "Vegetariano",
  'plant': "Vegano",
  'grains': "Sin gluten",
  'fish': "Pescado",
  'cow': "Carne",
  'first-aid': "Alergias",
  'chef-hat': "Catering",
  'wine': "Barra libre",
  'check-circle': "Confirmado",
  'x-circle': "No asiste",
  'clock-countdown': "Pendiente",
  'circle-dashed': "Sin hacer",
  'warning': "Atención",
  'info': "Información",
  'prohibit': "Bloqueado",
  'eye': "Visible",
  'eye-slash': "Oculto",
  'lock-simple': "Privado",
  'gift': "Regalo",
  'currency-eur': "Aportación",
  'credit-card': "Tarjeta",
  'bank': "Transferencia",
  'device-mobile': "Bizum",
  'money': "Efectivo",
  'hand-coins': "Recibido",
  'list-checks': "Checklist",
  'chart-bar': "Presupuesto",
  'chart-pie-slice': "Reparto",
  'briefcase': "Proveedores",
  'file-text': "Contrato",
  'table': "Mesas",
  'seat': "Asiento",
  'envelope': "Invitación",
  'whatsapp-logo': "WhatsApp",
  'share-network': "Compartir",
  'download-simple': "Exportar",
  'upload-simple': "Importar",
  'gear': "Configuración",
  'palette': "Diseño",
  'sliders-horizontal': "Módulos",
  'plus': "Añadir",
  'pencil-simple': "Editar",
  'trash': "Eliminar",
  'archive': "Archivar",
  'magnifying-glass': "Buscar",
  'funnel': "Filtrar",
  'dots-three': "Más acciones",
  'caret-up': "Orden ascendente",
  'caret-up-down': "Ordenar",
  'caret-down': "Desplegar",
  'caret-right': "Siguiente",
  'caret-left': "Anterior",
  'x': "Cerrar",
  'check': "Aceptar",
  'arrow-left': "Volver",
  'list': "Menú",
  'dots-six-vertical': "Arrastrar",
  'spinner-gap': "Cargando",
  'bell': "Avisos",
  'star': "Destacado",
  'question': "Preguntas frecuentes",
  'game-controller': "Quiz",
  'trophy': "Ranking",
  'images': "Galería",
  'note-pencil': "Libro de firmas",
  'playlist': "Playlist",
  'copy': "Copiar",
  'link-simple': "Enlace",
  'arrows-clockwise': "Cambiar el enlace",
  'chat-circle-text': "Respuestas",
  'sign-out': "Cerrar sesión",
  'book-open': "Historia",
  'paint-brush': "Pincel",
  'storefront': "Tienda",
  'seal-check': "Sello de garantía",
  'rocket': "Cohete",
  'lock-open': "Candado abierto",
  'shield-check': "Escudo",
  'calendar-check': "Calendario con visto",
  'desktop': "Ordenador",
  'cursor-click': "Clic",
  'magic-wand': "Varita",
  'layout': "Maquetación",
  'arrow-right': "Flecha",
};
