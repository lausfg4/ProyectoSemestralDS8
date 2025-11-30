// ===============================
// CONFIGURACIÓN
// ===============================

// Recuperar token almacenado en el login
const token = localStorage.getItem("token");

if (!token) {
    alert("No tienes sesión activa");
    window.location.href = "login.html";
}


// ===============================
// FUNCIONES PARA TRAER LA DATA
// ===============================
async function cargarAsistencias() {
    try {
        let respuesta = await fetch("http://161.35.190.4:8000/api/asistencia_estudiante/", {
            method: "GET",
            headers: {
                "Authorization": "Token " + token,
                "Content-Type": "application/json"
            }
        });

        if (!respuesta.ok) {
            console.log("Error al cargar asistencias");
            return;
        }

        let data = await respuesta.json();
        console.log("Asistencias:", data);

        actualizarDashboard(data);
        mostrarUltimasAsistencias(data);
        mostrarProximasClases(data);

    } catch (error) {
        console.error("Error inesperado:", error);
    }
}


// ===============================
// ACTUALIZAR LOS CARDS PRINCIPALES
// ===============================
function actualizarDashboard(asistencias) {

    // Total del día actual
    let hoy = new Date().toLocaleDateString("es-PA", { weekday: "long" }).toLowerCase();

    let asistenciasHoy = asistencias.filter(a => a.dia.toLowerCase() === hoy);

    let presentesHoy = asistenciasHoy.filter(a => a.presente === true);

    // Rellenar tarjetas
    document.getElementById("asisHoy").textContent = `${presentesHoy.length}/${asistenciasHoy.length}`;
    document.getElementById("clasesHoy").textContent = asistenciasHoy.length;

    // Porcentaje general
    let totalPresentes = asistencias.filter(a => a.presente === true).length;
    let totalClases = asistencias.length;
    let porcentaje = totalClases > 0 ? Math.round((totalPresentes / totalClases) * 100) : 0;

    document.getElementById("porcentajeGeneral").textContent = `${porcentaje}%`;
}


// ===============================
// mostrar últimas asistencias
// ===============================
function mostrarUltimasAsistencias(asistencias) {
    let contenedor = document.getElementById("ultAsistencias");
    contenedor.innerHTML = "";

    asistencias.slice(0, 5).forEach(a => {
        contenedor.innerHTML += `
            <div class="item">
                <strong>${a.materia}</strong>
                <span>${formatearFechaBonita(a.timestamp)}</span>
                <p>${a.presente ? "✔ Presente" : "❌ Ausente"}</p>
            </div>
        `;
    });
}


// ===============================
// Próximas clases de HOY
// ===============================
function mostrarProximasClases(asistencias) {
    let contenedor = document.getElementById("proximasClases");
    contenedor.innerHTML = "";

    let hoy = new Date().toLocaleDateString("es-PA", { weekday: "long" }).toLowerCase();

    let clasesHoy = asistencias.filter(a => a.dia.toLowerCase() === hoy);

    clasesHoy.forEach(c => {
        contenedor.innerHTML += `
            <div class="item">
                <strong>${c.materia}</strong>
                <span>${c.inicio} - ${c.fin}</span>
            </div>
        `;
    });

    if (clasesHoy.length === 0) {
        contenedor.innerHTML = "<p>No tienes clases hoy.</p>";
    }
}

function formatearFechaBonita(fechaOriginal) {
    let fecha = new Date(fechaOriginal);

    // Fecha en español
    let opcionesFecha = {
        day: "2-digit",
        month: "long",
        year: "numeric"
    };

    let opcionesHora = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    };

    let fechaBonita = fecha.toLocaleDateString("es-ES", opcionesFecha);
    let horaBonita = fecha.toLocaleTimeString("es-ES", opcionesHora);

    return `${fechaBonita} — ${horaBonita}`;
}



// ===============================
// EJECUTAR
// ===============================
cargarAsistencias();
