function keepSidebarItemVisible(sidebar, activeItem) {
  const itemTop = activeItem.offsetTop;
  const itemBottom = itemTop + activeItem.offsetHeight;
  const visibleTop = sidebar.scrollTop;
  const visibleBottom = visibleTop + sidebar.clientHeight;
  const padding = 12;

  if (itemTop < visibleTop + padding) {
      sidebar.scrollTop = Math.max(0, itemTop - padding);
  } else if (itemBottom > visibleBottom - padding) {
      sidebar.scrollTop = itemBottom - sidebar.clientHeight + padding;
  }
}

function getActiveCreatorQuestionId() {
  const editors = document.querySelectorAll('.question-editor');
  let currentId = null;
  let nearestId = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  editors.forEach(editor => {
      const rect = editor.getBoundingClientRect();
      const id = editor.id.replace('q-edit-', '');

      if (rect.top <= 250 && rect.bottom >= 250) {
          currentId = id;
      }

      const distance = Math.abs(rect.top - 250);
      if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestId = id;
      }
  });

  return currentId ?? nearestId;
}

export function syncActiveCreatorQuestion(keepVisible = true) {
  const currentId = getActiveCreatorQuestionId();
  const sidebar = document.getElementById('creator-sidebar');
  if (currentId === null) return;

  const activeItem = document.getElementById(`sidebar-q-${currentId}`);
  if (!activeItem) return;

  document.querySelectorAll('#creator-sidebar .nav-item').forEach(item => item.classList.remove('active'));
  activeItem.classList.add('active');

  if (keepVisible && sidebar) keepSidebarItemVisible(sidebar, activeItem);
}
