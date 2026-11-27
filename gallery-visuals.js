/* Camada visual compartilhada das salas: não altera controles, colisões ou interação. */
(function () {
    'use strict';

    function tiledTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#2c2e30';
        ctx.fillRect(0, 0, 512, 512);
        const tile = 128;
        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                const shade = 42 + ((x * 7 + y * 11) % 7);
                ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 3})`;
                ctx.fillRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
                ctx.fillStyle = 'rgba(255,255,255,0.022)';
                ctx.fillRect(x * tile + 5, y * tile + 5, tile - 10, 2);
            }
        }
        for (let i = 0; i < 2600; i++) {
            const v = 52 + Math.floor(Math.random() * 18);
            ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.1})`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(5.5, 6.5);
        texture.anisotropy = 4;
        return texture;
    }

    function plasterTexture(baseHex) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = baseHex || '#dedbd2';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 4200; i++) {
            ctx.fillStyle = Math.random() > 0.5
                ? `rgba(255,255,255,${Math.random() * 0.04})`
                : `rgba(72,62,48,${Math.random() * 0.026})`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 2);
        return texture;
    }

    window.createArtGalleryFloorTexture = tiledTexture;
    window.createArtGalleryWallTexture = plasterTexture;

    window.buildArtMuseumArchitecture = function (group, roomW, roomD, roomH) {
        const warmWhite = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.82, metalness: 0.02 });
        const charcoal = new THREE.MeshStandardMaterial({ color: 0x202326, roughness: 0.58, metalness: 0.42 });
        const trim = new THREE.MeshStandardMaterial({ color: 0x6f6d68, roughness: 0.48, metalness: 0.3 });
        const glow = new THREE.MeshStandardMaterial({ color: 0xfff5da, emissive: 0xffe8ae, emissiveIntensity: 0.65, roughness: 0.35 });
        const velvet = new THREE.MeshStandardMaterial({ color: 0x3d182a, roughness: 0.94, metalness: 0.01, side: THREE.DoubleSide });
        const curtainTie = new THREE.MeshStandardMaterial({ color: 0xae8a46, roughness: 0.36, metalness: 0.7 });

        // Molduras baixas e faixa de parede, como numa sala de exposição.
        const baseH = 0.13;
        const addBaseboard = (w, d, x, z) => {
            const piece = new THREE.Mesh(new THREE.BoxGeometry(w, baseH, d), trim);
            piece.position.set(x, baseH / 2, z);
            group.add(piece);
        };
        addBaseboard(roomW - 0.5, 0.08, 0, -roomD / 2 + 0.29);
        addBaseboard(roomW - 0.5, 0.08, 0, roomD / 2 - 0.29);
        addBaseboard(0.08, roomD - 0.5, -roomW / 2 + 0.29, 0);
        addBaseboard(0.08, roomD - 0.5, roomW / 2 - 0.29, 0);

        // Teto claro em placas e trilhos pretos com luminárias discretas.
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW - 0.55, roomD - 0.55), warmWhite);
        ceiling.position.y = roomH - 0.035;
        ceiling.rotation.x = Math.PI / 2;
        group.add(ceiling);

        [-6.5, 0, 6.5].forEach(x => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, roomD - 1.8), charcoal);
            rail.position.set(x, roomH - 0.17, 0);
            group.add(rail);
            for (let z = -10.5; z <= 10.5; z += 4.2) {
                const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12), charcoal);
                mount.position.set(x, roomH - 0.27, z);
                group.add(mount);
                const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.18, 16), glow);
                lamp.position.set(x, roomH - 0.39, z);
                group.add(lamp);
            }
        });

        // Linhas finas no teto, sugerindo painéis arquitetônicos.
        for (let z = -12; z <= 12; z += 4) {
            const seam = new THREE.Mesh(new THREE.BoxGeometry(roomW - 0.7, 0.018, 0.028), trim);
            seam.position.set(0, roomH - 0.06, z);
            group.add(seam);
        }

        // Cortinas de veludo: molduram as paredes sem ocupar a área de circulação.
        const addCurtain = (x, z, width, rotationY) => {
            const curtain = new THREE.Mesh(new THREE.PlaneGeometry(width, 3.25, 12, 1), velvet);
            const positions = curtain.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const px = positions.getX(i);
                positions.setZ(i, Math.sin((px / width) * Math.PI * 8) * 0.075);
            }
            positions.needsUpdate = true;
            curtain.position.set(x, 2.22, z);
            curtain.rotation.y = rotationY;
            group.add(curtain);
            const tie = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.055, 0.07), curtainTie);
            tie.position.set(x, 1.45, z + (rotationY === 0 ? 0.06 : 0));
            tie.rotation.y = rotationY;
            group.add(tie);
        };
        addCurtain(-8.9, -roomD / 2 + 0.27, 3.1, 0);
        addCurtain(8.9, -roomD / 2 + 0.27, 3.1, 0);
        addCurtain(-roomW / 2 + 0.27, -8.5, 3.1, Math.PI / 2);
        addCurtain(roomW / 2 - 0.27, 8.5, 3.1, Math.PI / 2);
    };
}());
