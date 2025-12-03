document.addEventListener("DOMContentLoaded", cargarAsistencias);

// Normalizar día
function normalizarDia(dia) {
    return dia
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Formato HH:MM
function formatearHora(hora) {
    return hora.substring(0,5);
}

// Mapeo día → número JS
const diaNumero = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6
};

const ahora = new Date();
const diaActual = ahora.getDay();
const horaActual = ahora.toTimeString().substring(0,5);

// Verificar si una clase ya pasó
function esClasePasada(dia, hora) {
    const d = diaNumero[dia];
    if (d < diaActual) return true;      // Día anterior
    if (d > diaActual) return false;     // Día futuro

    // Mismo día -> comparar hora
    return hora < horaActual;
}

// === LISTA DE CLASES ===
const horarioClases = [
    "lunes-07:50","lunes-08:40","lunes-09:30","lunes-10:20","lunes-11:10",
    "martes-08:40","martes-09:30","martes-10:20","martes-11:10",
    "miercoles-08:40","miercoles-09:30","miercoles-10:20","miercoles-11:10",
    "jueves-08:40","jueves-09:30","jueves-10:20","jueves-11:10",
    "viernes-07:50","viernes-08:40","viernes-09:30","viernes-10:20","viernes-11:10"
];

async function cargarAsistencias() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const response = await fetch("http://161.35.190.4:8000/api/asistencia_estudiante/", {
        headers: { "Authorization": "Token " + token }
    });

    const asistencias = await response.json();
    console.log("Asistencias recibidas:", asistencias);

    // Guardar asistencias en un Set
    const asistenciasSet = new Set(
        asistencias.map(a => 
            `${normalizarDia(a.dia)}-${formatearHora(a.inicio)}`
        )
    );

    // Pintar asistencias verdes o rojas
    asistencias.forEach(a => {
        let dia = normalizarDia(a.dia);
        let hora = formatearHora(a.inicio);
        let celda = document.getElementById(`celda-${dia}-${hora}`);

        if (!celda) return;

        celda.classList.remove("presente","ausente");

        if (a.presente === true) {
            celda.classList.add("presente");
        } else {
            celda.classList.add("ausente");
        }
    });

    // Pintar ausencias SOLO SI YA PASÓ LA HORA
    horarioClases.forEach(id => {
        let [dia, hora] = id.split("-");

        if (!esClasePasada(dia, hora)) return; // aún no ha pasado → no pintar

        if (!asistenciasSet.has(id)) {
            let celda = document.getElementById(`celda-${id}`);
            if (celda) {
                celda.classList.add("ausente");
            }
        }
    });
}
