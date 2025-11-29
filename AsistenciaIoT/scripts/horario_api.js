document.addEventListener("DOMContentLoaded", cargarAsistencias);

async function cargarAsistencias() {

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch("http://161.35.190.4:8000/api/asistencia_estudiante/", {
            headers: { "Authorization": "Bearer " + token }
        });

        const asistencias = await response.json();

        asistencias.forEach(a => {

            let dia = a.dia.toLowerCase();  
            let inicio = a.inicio.substring(0,5); 
            const celda = document.getElementById(`celda-${dia}-${inicio}`);

            if (!celda) return;

            // Limpiar estilos previos
            celda.classList.remove("presente", "ausente");

            if (a.presente === true) {
                celda.classList.add("presente");
            } else if (a.presente === false) {
                celda.classList.add("ausente");
            }

        });

    } catch (err) {
        console.error("ERROR:", err);
    }
}
