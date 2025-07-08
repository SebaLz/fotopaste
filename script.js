class FotoPaste {
    constructor() {
        this.images = [];
        this.storageKey = 'fotopaste_images';
        this.maxImages = 50; // Límite de imágenes en caché
        this.expandedTimeout = null;
        
        this.init();
    }

    init() {
        this.loadImagesFromCache();
        this.setupEventListeners();
        this.renderImages();
    }

    setupEventListeners() {
        // Evento de pegado global
        document.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Evento de arrastrar y soltar
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Botón de selección de archivo
        const selectFileBtn = document.getElementById('selectFileBtn');
        const fileInput = document.getElementById('fileInput');
        
        selectFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Evento de clic en el área de upload
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'v') {
                // Mostrar indicación visual de que se puede pegar
                uploadArea.classList.add('dragover');
                setTimeout(() => uploadArea.classList.remove('dragover'), 200);
            }
        });
    }

    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                this.processImage(file);
                break;
            }
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                this.processImage(file);
            }
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                this.processImage(file);
            }
        }
        // Limpiar el input para permitir seleccionar el mismo archivo
        e.target.value = '';
    }

    processImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.showToast('Por favor selecciona una imagen válida', 'error');
            return;
        }

        // Verificar tamaño del archivo (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('La imagen es demasiado grande. Máximo 10MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                id: Date.now() + Math.random(),
                name: file.name || 'Imagen sin nombre',
                size: this.formatFileSize(file.size),
                type: file.type,
                dataUrl: e.target.result,
                timestamp: new Date().toISOString(),
                width: 0,
                height: 0,
                isExpanded: true, // Nueva imagen se muestra expandida
                isSuperExpanded: false
            };

            // Obtener dimensiones de la imagen
            const img = new Image();
            img.onload = () => {
                imageData.width = img.width;
                imageData.height = img.height;
                this.addImage(imageData);
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    addImage(imageData) {
        // Verificar límite de imágenes
        if (this.images.length >= this.maxImages) {
            this.images.shift(); // Remover la imagen más antigua
        }

        this.images.unshift(imageData); // Agregar al inicio
        this.saveImagesToCache();
        this.renderImages();
        this.showToast('Imagen agregada exitosamente');
        
        // Auto-contraer después de 3 segundos
        this.expandedTimeout = setTimeout(() => {
            this.collapseImage(imageData.id);
        }, 3000);
    }

    removeImage(imageId) {
        this.images = this.images.filter(img => img.id !== imageId);
        this.saveImagesToCache();
        this.renderImages();
        this.showToast('Imagen eliminada');
    }

    expandImage(imageId) {
        // Contraer todas las imágenes primero
        this.images.forEach(img => {
            img.isExpanded = false;
        });
        
        // Expandir la imagen seleccionada
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            image.isExpanded = true;
            this.renderImages();
        }
    }

    collapseImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            image.isExpanded = false;
            this.renderImages();
        }
    }

    toggleImageExpansion(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (image) {
            if (image.isExpanded) {
                this.collapseImage(imageId);
            } else {
                this.expandImage(imageId);
            }
        }
    }

    renderImages() {
        const imagesGrid = document.getElementById('imagesGrid');
        
        if (this.images.length === 0) {
            imagesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h3>No hay imágenes aún</h3>
                    <p>Pega una imagen o selecciona un archivo para comenzar</p>
                </div>
            `;
            return;
        }

        imagesGrid.innerHTML = this.images.map(image => `
            <div class="image-card ${image.isExpanded ? 'expanded' : ''}${image.isSuperExpanded ? ' super-expanded' : ''}" data-id="${image.id}">
                <img src="${image.dataUrl}" 
                     alt="${image.name}" 
                     title="Clic para expandir/contraer. Click derecho para expandir."
                     onclick="fotoPaste.toggleImageExpansion(${image.id})"
                     oncontextmenu="fotoPaste.expandOnContextMenu(event, ${image.id})">
                <div class="image-info">
                    <h4>${this.truncateFileName(image.name)}</h4>
                    <p>${image.size} • ${image.width}x${image.height}</p>
                    <p>${this.formatDate(image.timestamp)}</p>
                    <div class="image-actions">
                        <button class="btn btn-secondary" onclick="fotoPaste.superExpandImage(${image.id})">
                            <i class="fas fa-expand"></i> Expandir
                        </button>
                        <button class="btn delete-btn" onclick="fotoPaste.removeImage(${image.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
                ${image.isSuperExpanded ? '<button class="close-super" onclick="fotoPaste.closeSuperExpand(${image.id})"><i class="fas fa-times"></i></button>' : ''}
            </div>
        `).join('');

        // Cerrar super-expandido al hacer click fuera de la imagen
        document.querySelectorAll('.image-card.super-expanded').forEach(card => {
            card.addEventListener('mousedown', (e) => {
                if (e.target === card) {
                    const id = parseFloat(card.dataset.id);
                    this.closeSuperExpand(id);
                }
            });
        });
    }

    openInNewTab(imageUrl) {
        // Expandir la imagen primero
        const imageCard = document.querySelector(`img[src="${imageUrl}"]`).closest('.image-card');
        const imageId = parseFloat(imageCard.dataset.id);
        this.expandImage(imageId);
        
        // Luego abrir en nueva pestaña
        window.open(imageUrl, '_blank');
    }

    copyImageUrl(imageUrl) {
        navigator.clipboard.writeText(imageUrl).then(() => {
            this.showToast('URL de imagen copiada al portapapeles');
        }).catch(() => {
            this.showToast('No se pudo copiar la URL', 'error');
        });
    }

    downloadImage(imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `fotopaste_${Date.now()}.jpg`;
        link.click();
        this.showToast('Descargando imagen...');
    }

    saveImagesToCache() {
        try {
            // Comprimir datos antes de guardar
            const compressedData = this.compressImageData();
            localStorage.setItem(this.storageKey, JSON.stringify(compressedData));
        } catch (error) {
            console.warn('No se pudo guardar en caché:', error);
            // Si el localStorage está lleno, limpiar algunas imágenes
            if (error.name === 'QuotaExceededError') {
                this.images = this.images.slice(0, 10); // Mantener solo las 10 más recientes
                this.saveImagesToCache();
            }
        }
    }

    loadImagesFromCache() {
        try {
            const cached = localStorage.getItem(this.storageKey);
            if (cached) {
                const data = JSON.parse(cached);
                this.images = this.decompressImageData(data);
                // Asegurar que todas las imágenes estén contraídas al cargar
                this.images.forEach(img => {
                    img.isExpanded = false;
                });
            }
        } catch (error) {
            console.warn('Error al cargar caché:', error);
            this.images = [];
        }
    }

    compressImageData() {
        // Comprimir datos de imagen para ahorrar espacio
        return this.images.map(img => ({
            ...img,
            dataUrl: img.dataUrl.length > 1000000 ? this.compressImage(img.dataUrl) : img.dataUrl
        }));
    }

    decompressImageData(data) {
        return data || [];
    }

    compressImage(dataUrl) {
        // Compresión básica de imagen
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Redimensionar si es muy grande
                const maxSize = 800;
                let { width, height } = img;
                
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            
            img.src = dataUrl;
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Hace un momento';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    truncateFileName(name, maxLength = 20) {
        if (name.length <= maxLength) return name;
        const extension = name.split('.').pop();
        const nameWithoutExt = name.substring(0, name.lastIndexOf('.'));
        const truncated = nameWithoutExt.substring(0, maxLength - 3);
        return `${truncated}...${extension ? '.' + extension : ''}`;
    }

    expandOnContextMenu(e, imageId) {
        e.preventDefault();
        
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="expand">
                <i class="fas fa-expand"></i>
                <span>Expandir</span>
            </div>
            <div class="context-menu-item" data-action="open">
                <i class="fas fa-external-link-alt"></i>
                <span>Abrir en nueva pestaña</span>
            </div>
            <div class="context-menu-item" data-action="copy">
                <i class="fas fa-link"></i>
                <span>Copiar URL</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="download">
                <i class="fas fa-download"></i>
                <span>Descargar imagen</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <i class="fas fa-trash"></i>
                <span>Eliminar</span>
            </div>
        `;

        // Posicionar el menú
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.top = `${e.pageY}px`;
        document.body.appendChild(contextMenu);

        // Asegurarse que el menú no se salga de la pantalla
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }

        // Mostrar el menú con animación
        requestAnimationFrame(() => contextMenu.classList.add('show'));

        // Manejar las acciones del menú
        contextMenu.addEventListener('click', (event) => {
            const action = event.target.closest('.context-menu-item')?.dataset.action;
            if (!action) return;

            switch (action) {
                case 'expand':
                    this.superExpandImage(imageId);
                    break;
                case 'open':
                    this.openInNewTab(image.dataUrl);
                    break;
                case 'copy':
                    this.copyImageUrl(image.dataUrl);
                    break;
                case 'download':
                    this.downloadImage(image.dataUrl);
                    break;
                case 'delete':
                    this.removeImage(imageId);
                    break;
            }
            this.closeContextMenu();
        });

        // Cerrar el menú al hacer clic fuera
        const closeHandler = (e) => {
            if (!contextMenu.contains(e.target)) {
                this.closeContextMenu();
                document.removeEventListener('mousedown', closeHandler);
            }
        };
        document.addEventListener('mousedown', closeHandler);

        // Cerrar el menú al presionar Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeContextMenu();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    closeContextMenu() {
        const contextMenu = document.querySelector('.context-menu');
        if (contextMenu) {
            contextMenu.classList.remove('show');
            setTimeout(() => contextMenu.remove(), 200);
        }
    }

    superExpandImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        // Cerrar otras imágenes super expandidas
        this.images.forEach(img => {
            if (img.id !== imageId) {
                img.isSuperExpanded = false;
            }
        });

        image.isSuperExpanded = true;
        
        // Crear el visor de imágenes
        const viewer = document.createElement('div');
        viewer.className = 'image-viewer-overlay';
        viewer.innerHTML = `
            <div class="image-viewer-content">
                <div class="image-viewer-img-container">
                    <img src="${image.dataUrl}" class="image-viewer-img" alt="${image.name}">
                </div>
                <button class="image-viewer-close">
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-viewer-info">
                    <i class="fas fa-image"></i>
                    <span>${image.name} • ${image.width}x${image.height}</span>
                </div>
                <button class="image-viewer-nav prev">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button class="image-viewer-nav next">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <div class="image-viewer-toolbar">
                    <button class="image-viewer-button" data-action="zoom-out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <div class="image-viewer-zoom-level">100%</div>
                    <button class="image-viewer-button" data-action="zoom-in">
                        <i class="fas fa-search-plus"></i>
                    </button>
                    <button class="image-viewer-button" data-action="fit">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="image-viewer-button" data-action="actual">
                        <i class="fas fa-compress"></i>
                    </button>
                    <button class="image-viewer-button" data-action="rotate">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="image-viewer-button" data-action="download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(viewer);
        document.body.style.overflow = 'hidden';

        // Inicializar el visor
        const container = viewer.querySelector('.image-viewer-img-container');
        const img = viewer.querySelector('.image-viewer-img');
        const zoomLevel = viewer.querySelector('.image-viewer-zoom-level');
        
        let scale = 1;
        let rotation = 0;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let lastY = 0;

        // Función para actualizar la transformación
        const updateTransform = () => {
            container.style.transform = `translate(${translateX}px, ${translateY}px)`;
            img.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
            zoomLevel.textContent = `${Math.round(scale * 100)}%`;
        };

        // Función para ajustar la imagen
        const fitImage = () => {
            const viewerRect = viewer.querySelector('.image-viewer-content').getBoundingClientRect();
            const imgRect = img.getBoundingClientRect();
            const scaleX = viewerRect.width / imgRect.width;
            const scaleY = viewerRect.height / imgRect.height;
            scale = Math.min(scaleX, scaleY) * 0.9;
            translateX = 0;
            translateY = 0;
            rotation = 0;
            updateTransform();
        };

        // Función para hacer zoom en un punto específico
        const zoomAtPoint = (x, y, zoomIn) => {
            const rect = container.getBoundingClientRect();
            const pointX = x - rect.left;
            const pointY = y - rect.top;
            
            const oldScale = scale;
            scale = zoomIn ? Math.min(scale * 2, 5) : Math.max(scale / 2, 0.1);
            
            if (scale !== oldScale) {
                const scaleDiff = scale / oldScale;
                translateX += pointX * (1 - scaleDiff);
                translateY += pointY * (1 - scaleDiff);
                updateTransform();
            }
        };

        // Ajustar imagen inicialmente
        img.onload = fitImage;

        // Eventos de zoom
        viewer.querySelector('[data-action="zoom-in"]').onclick = () => {
            const rect = container.getBoundingClientRect();
            zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
        };

        viewer.querySelector('[data-action="zoom-out"]').onclick = () => {
            const rect = container.getBoundingClientRect();
            zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, false);
        };

        viewer.querySelector('[data-action="fit"]').onclick = fitImage;

        viewer.querySelector('[data-action="actual"]').onclick = () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            rotation = 0;
            updateTransform();
        };

        viewer.querySelector('[data-action="rotate"]').onclick = () => {
            rotation = (rotation + 90) % 360;
            updateTransform();
        };

        viewer.querySelector('[data-action="download"]').onclick = () => {
            this.downloadImage(image.dataUrl);
        };

        // Eventos de arrastre
        const startDrag = (e) => {
            if (e.button !== 0) return; // Solo botón izquierdo
            
            const touch = e.touches ? e.touches[0] : e;
            isDragging = true;
            container.classList.add('grabbing');
            startX = touch.clientX - translateX;
            startY = touch.clientY - translateY;
            lastX = touch.clientX;
            lastY = touch.clientY;
        };

        const handleDrag = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches ? e.touches[0] : e;
            translateX = touch.clientX - startX;
            translateY = touch.clientY - startY;
            lastX = touch.clientX;
            lastY = touch.clientY;
            updateTransform();
        };

        const endDrag = () => {
            isDragging = false;
            container.classList.remove('grabbing');
        };

        // Eventos de mouse
        container.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevenir selección de texto
            startDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                handleDrag(e);
            }
        });

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mouseleave', endDrag);

        // Doble click para zoom
        container.addEventListener('dblclick', (e) => {
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            // Si ya estamos en zoom máximo, volvemos al ajuste automático
            if (scale >= 4.9) {
                fitImage();
            } else {
                zoomAtPoint(x, y, true);
            }
        });

        // Eventos táctiles
        container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDrag(e);
        });

        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                handleDrag(e);
            }
        }, { passive: false });

        document.addEventListener('touchend', endDrag);
        document.addEventListener('touchcancel', endDrag);

        // Zoom con rueda del mouse
        viewer.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.max(0.1, Math.min(5, scale * delta));
            
            if (newScale !== scale) {
                // Zoom hacia el punto del cursor
                const rect = container.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                
                const scaleDiff = newScale / scale;
                const pointX = x - rect.left;
                const pointY = y - rect.top;
                
                translateX += pointX * (1 - scaleDiff);
                translateY += pointY * (1 - scaleDiff);
                scale = newScale;
                
                updateTransform();
            }
        };

        // Navegación
        const prevButton = viewer.querySelector('.prev');
        const nextButton = viewer.querySelector('.next');
        
        prevButton.onclick = () => this.navigateImages(imageId, 'prev');
        nextButton.onclick = () => this.navigateImages(imageId, 'next');

        // Cerrar visor
        const closeViewer = () => {
            viewer.remove();
            document.body.style.overflow = '';
            image.isSuperExpanded = false;
            this.renderImages();
        };

        viewer.querySelector('.image-viewer-close').onclick = closeViewer;
        viewer.onclick = (e) => {
            if (e.target === viewer) closeViewer();
        };

        // Eventos de teclado
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'Escape':
                    closeViewer();
                    break;
                case 'ArrowLeft':
                    this.navigateImages(imageId, 'prev');
                    break;
                case 'ArrowRight':
                    this.navigateImages(imageId, 'next');
                    break;
                case '0':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        fitImage();
                    }
                    break;
                case '+':
                case '=':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        scale = Math.min(scale * 1.1, 5);
                        updateTransform();
                    }
                    break;
                case '-':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        scale = Math.max(scale / 1.1, 0.1);
                        updateTransform();
                    }
                    break;
            }
        });
    }

    navigateImages(currentImageId, direction) {
        const currentIndex = this.images.findIndex(img => img.id === currentImageId);
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'prev') {
            newIndex = currentIndex === 0 ? this.images.length - 1 : currentIndex - 1;
        } else {
            newIndex = currentIndex === this.images.length - 1 ? 0 : currentIndex + 1;
        }

        this.closeSuperExpand(currentImageId);
        setTimeout(() => this.superExpandImage(this.images[newIndex].id), 200);
    }

    closeSuperExpand(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;

        image.isSuperExpanded = false;
        this.renderImages();

        // Restaurar scroll del body
        document.body.style.overflow = '';
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        // Limpiar clases anteriores
        toast.className = 'toast';
        
        // Agregar nuevas clases
        toast.classList.add(type);
        
        // Actualizar mensaje e icono
        let icon = 'check-circle';
        switch (type) {
            case 'error':
                icon = 'times-circle';
                break;
            case 'warning':
                icon = 'exclamation-circle';
                break;
            case 'info':
                icon = 'info-circle';
                break;
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span id="toastMessage">${message}</span>
        `;
        
        // Mostrar toast con animación
        requestAnimationFrame(() => {
            toast.classList.add('show');
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        });
    }

    // Métodos de utilidad
    clearAllImages() {
        if (confirm('¿Estás seguro de que quieres eliminar todas las imágenes?')) {
            this.images = [];
            this.saveImagesToCache();
            this.renderImages();
            this.showToast('Todas las imágenes han sido eliminadas');
        }
    }

    exportImages() {
        const dataStr = JSON.stringify(this.images, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `fotopaste_images_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Imágenes exportadas');
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.fotoPaste = new FotoPaste();
    
    // Agregar atajos de teclado globales
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            window.fotoPaste.clearAllImages();
        }
        
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            window.fotoPaste.exportImages();
        }
    });
});

// Mejorar la experiencia de usuario con indicaciones visuales
document.addEventListener('paste', () => {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.style.transform = 'scale(1.05)';
    setTimeout(() => {
        uploadArea.style.transform = 'scale(1)';
    }, 200);
});

// Agregar soporte para PWA básico
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
} 