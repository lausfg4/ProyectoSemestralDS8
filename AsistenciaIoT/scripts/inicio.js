const token = localStorage.getItem("token");
const nombre = localStorage.getItem("nombre");
document.getElementById("nombreUsuario").textContent = nombre;

// =========================
//     CARGAR PRÓXIMAS CLASES
// =========================
async function cargarProximasClases() {
    const res = await fetch("http://161.35.190.4:8000/api/horario_estudiante/", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    const contenedor = document.getElementById("proximasClases");

    let hoy = new Date().getDay(); 
    if (hoy === 0) hoy = 7;

    const clasesHoy = data.filter(x => x.dia === hoy);

    document.getElementById("clasesHoy").textContent = clasesHoy.length;

    if (clasesHoy.length === 0) {
        contenedor.innerHTML = "<p>No tienes clases hoy.</p>";
        return;
    }

    clasesHoy.forEach(c => {
        contenedor.innerHTML += `
            <div class="item">
                <span>${c.materia} — ${c.inicio} a ${c.fin}</span>
                <span>Aula ${c.aula}</span>
            </div>
        `;
    });
}

// =========================
//     ÚLTIMAS ASISTENCIAS
// =========================
async function cargarAsistencias() {
    const res = await fetch("http://161.35.190.4:8000/api/asistencia_estudiante/", {
        headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await res.json();
    const cont = document.getElementById("ultAsistencias");

    let presentes = 0;
    data.forEach(a => {
        if (a.presente) presentes++;
    });

    document.getElementById("porcentajeGeneral").textContent =
        Math.round((presentes / data.length) * 100) + "%";

    data.slice(0,5).forEach(a => {
        cont.innerHTML += `
        <div class="item">
            <span>${a.materia} — ${a.dia}</span>
            <span>${a.presente ? "✔ Presente" : "❌ Ausente"}</span>
        </div>`;
    });

    // contar asistencias de hoy
    let hoy = new Date().toISOString().split("T")[0];
    let asistHoy = data.filter(a => a.timestamp.startsWith(hoy));
    document.getElementById("asisHoy").textContent = asistHoy.length + "/" + data.length;
}

// =========================
//     INICIALIZAR
// =========================
cargarProximasClases();
cargarAsistencias();
