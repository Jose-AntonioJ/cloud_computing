// --- Supabase (corrige orden y evita duplicados) ---
const SUPABASE_URL = "https://kenoxpuvgauvjtvunmkp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlbm94cHV2Z2F1dmp0dnVubWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDUwMDYsImV4cCI6MjA3MDA4MTAwNn0.8q7fNkPBjleZZQmXdQQnY0SvnHdorMnQGWJ7jAi8h8M";
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Agregar (corrige limpieza de inputs) ---
async function agregarEstudiante() {
  const nombreInput = document.getElementById("nombre");
  const correoInput = document.getElementById("correo");
  const claseInput  = document.getElementById("clase");

  const nombre = nombreInput.value.trim();
  const correo = correoInput.value.trim();
  const clase  = claseInput.value.trim();

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) { alert("No estás autenticado."); return; }

  const { error } = await client.from("estudiantes").insert({
    nombre, correo, clase, user_id: user.id,
  });

  if (error) return alert("Error al agregar: " + error.message);

  nombreInput.value = ""; correoInput.value = ""; claseInput.value = "";
  alert("Estudiante agregado");
  cargarEstudiantes();
}

// --- Render de un <li> con botón de eliminar ---
function renderEstudianteItem(est) {
  const li = document.createElement("li");
  li.dataset.id = est.id;
  li.innerHTML = `
    <span class="estudiante-texto"></span>
    <div class="actions">
      <!-- Editar -->
      <button class="icon-btn icon-edit" title="Editar" aria-label="Editar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      </button>

      <!-- Eliminar -->
      <button class="icon-btn icon-delete" title="Eliminar" aria-label="Eliminar">
        <svg viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
          <path d="M10 11v6"></path><path d="M14 11v6"></path>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
        </svg>
      </button>
    </div>
  `;
  li.querySelector(".estudiante-texto").textContent = `${est.nombre} (${est.clase})`;

  li.querySelector(".icon-edit").addEventListener("click", () => {
    editarEstudiante(est, li);
  });
  li.querySelector(".icon-delete").addEventListener("click", () => {
    eliminarEstudiante(est.id, est.nombre);
  });
  return li;
}


// --- Cargar lista (opcional: filtra por usuario logueado) ---
async function cargarEstudiantes() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) { alert("No estás autenticado."); return; }

  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .eq("user_id", user.id) // quita esta línea si quieres ver todos
    .order("created_at", { ascending: false });

  if (error) return alert("Error al cargar estudiantes: " + error.message);

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";
  data.forEach(est => lista.appendChild(renderEstudianteItem(est)));
}

// --- Editar estudiante ---
function escapeHtml(str){ const p=document.createElement('div'); p.textContent=str ?? ''; return p.innerHTML; }

async function editarEstudiante(est, li) {
  const { value: formValues } = await Swal.fire({
    title: 'Editar estudiante',
    html: `
      <div class="swal-form">
        <label>Nombre</label>
        <input id="swal-nombre" class="swal2-input" placeholder="Nombre">
        <label>Correo</label>
        <input id="swal-correo" type="email" class="swal2-input" placeholder="correo@dominio.com">
        <label>Clase</label>
        <input id="swal-clase" class="swal2-input" placeholder="Ej. 23 B">
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar cambios',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    confirmButtonColor: '#1d4ed8',   // azul
    cancelButtonColor: '#6b7280',
    didOpen: () => {
      // set values de forma segura
      document.getElementById('swal-nombre').value = est.nombre || '';
      document.getElementById('swal-correo').value = est.correo || '';
      document.getElementById('swal-clase').value  = est.clase  || '';
    },
    preConfirm: () => {
      const nombre = document.getElementById('swal-nombre').value.trim();
      const correo = document.getElementById('swal-correo').value.trim();
      const clase  = document.getElementById('swal-clase').value.trim();

      if (!nombre) return Swal.showValidationMessage('El nombre es obligatorio');
      if (correo && !/^\S+@\S+\.\S+$/.test(correo)) {
        return Swal.showValidationMessage('Correo inválido');
      }
      return { nombre, correo, clase };
    }
  });

  if (!formValues) return; // cancelado

  // UI optimista
  const span = li.querySelector('.estudiante-texto');
  const prev = span.textContent;
  span.textContent = `${formValues.nombre} (${formValues.clase})`;

  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client
    .from('estudiantes')
    .update({
      nombre: formValues.nombre,
      correo: formValues.correo,
      clase:  formValues.clase
    })
    .eq('id', est.id)
    .eq('user_id', user.id)   // quítalo si un admin edita a todos
    .select('id');            // <- confirma filas afectadas

  if (error || !data || data.length === 0) {
    // revertir UI si falló
    span.textContent = prev;
    return Swal.fire({ title:'Error', text: error?.message || 'No se actualizó el registro.', icon:'error' });
  }

  Swal.fire({ title:'Guardado', text:'Cambios aplicados correctamente.', icon:'success', timer:1500, showConfirmButton:false });
  // refresco por si cambia algo más
  cargarEstudiantes();
}


// --- Eliminar con confirmación ---
function escapeHtml(str){ const p=document.createElement('div'); p.textContent=str; return p.innerHTML; }

async function eliminarEstudiante(id, nombre) {
  const result = await Swal.fire({
    title: 'Eliminar estudiante',
    html: `¿Deseas eliminar el registro de <b>${escapeHtml(nombre)}</b>?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280'
  });
  if (!result.isConfirmed) return;

  const { data: { user } } = await client.auth.getUser();
  const { error } = await client
    .from('estudiantes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // seguridad opcional

  if (error) {
    Swal.fire({ title:'Error', text:error.message, icon:'error' });
  } else {
    Swal.fire({ title:'Eliminado', text:'Registro eliminado correctamente.', icon:'success', timer:1500, showConfirmButton:false });
    cargarEstudiantes();
  }
}

cargarEstudiantes();

async function subirArchivo() {
    const archivoInput = document.getElementById("archivo");
    const archivo = archivoInput.files[0];

    if (!archivo) {
        alert("Selecciona un archivo primero.");
        return;
    }

    const {
        data: { user },
        error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
        alert("Sesión no válida.");
        return;
    }

    const nombreRuta = `${user.id}/${archivo.name}`;
    const { data, error } = await client.storage
        .from("tareas") //Nombre del bucket
        .upload(nombreRuta, archivo, {
            cacheControl: "3600",
            upsert: false,
        });

    if (error) {
        alert("Error al subir: " + error.message);
    } else {
        alert("Archivo subido correctamente.");
        listarArchivos();
    }
}

async function listarArchivos() {
    const {
        data: { user },
        error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
        alert("Sesión no válida.");
        return;
    }

    const { data, error } = await client.storage
        .from("tareas")
        .list(`${user.id}`, { limit: 20 });

    const lista = document.getElementById("lista-archivos");
    lista.innerHTML = "";

    if (error) {
        lista.innerHTML = "<li>Error al listar archivos</li>";
        return;
    }

    data.forEach(async (archivo) => {
        const { data: signedUrlData, error: signedUrlError } = await client.storage
            .from("tareas")
            .createSignedUrl(`${user.id}/${archivo.name}`, 60);

        if (signedUrlError) {
            console.error("Error al generar URL firmada:", signedUrlError.message);
            return;
        }

        const publicUrl = signedUrlData.signedUrl;

        const item = document.createElement("li");

        const esImagen = archivo.name.match(/\.(jpg|jpeg|png|gif)$/i);
        const esPDF = archivo.name.match(/\.pdf$/i);

        if (esImagen) {
            item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
        </a>
      `;
        } else if (esPDF) {
            item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>
      `;
        } else {
            item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
        }

        lista.appendChild(item);
    });
}
listarArchivos();

async function cerrarSesion() {
    const { error } = await client.auth.signOut();

    if (error) {
        alert("Error al cerrar sesión: " + error.message);
    } else {
        localStorage.removeItem("token");
        alert("Sesión cerrada.");
        window.location.href = "index.html";
    }
}