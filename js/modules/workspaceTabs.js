export function setupCommandTabs(commandTabs, commandTabPanels) {
    if (!commandTabs?.length || !commandTabPanels?.length) return;
    const panelsContainer = document.querySelector('.commands-tab-panels');

    const measurePanelHeight = (panel) => {
        if (!panel.classList.contains('hidden')) {
            return panel.offsetHeight;
        }

        const prev = {
            display: panel.style.display,
            position: panel.style.position,
            visibility: panel.style.visibility,
            pointerEvents: panel.style.pointerEvents,
            left: panel.style.left,
            top: panel.style.top,
            width: panel.style.width,
        };

        panel.style.display = 'grid';
        panel.style.position = 'absolute';
        panel.style.visibility = 'hidden';
        panel.style.pointerEvents = 'none';
        panel.style.left = '-9999px';
        panel.style.top = '0';
        panel.style.width = panelsContainer ? `${panelsContainer.clientWidth}px` : '100%';

        const measured = panel.offsetHeight;

        panel.style.display = prev.display;
        panel.style.position = prev.position;
        panel.style.visibility = prev.visibility;
        panel.style.pointerEvents = prev.pointerEvents;
        panel.style.left = prev.left;
        panel.style.top = prev.top;
        panel.style.width = prev.width;

        return measured;
    };

    const syncPanelsHeight = () => {
        if (!panelsContainer) return;
        let maxHeight = 0;
        commandTabPanels.forEach((panel) => {
            maxHeight = Math.max(maxHeight, measurePanelHeight(panel));
        });
        panelsContainer.style.minHeight = `${Math.ceil(maxHeight)}px`;
    };

    const setActiveTab = (tabName) => {
        commandTabs.forEach((tab) => {
            const isActive = tab.dataset.tabTarget === tabName;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        commandTabPanels.forEach((panel) => {
            const isActive = panel.dataset.tabPanel === tabName;
            panel.classList.toggle('hidden', !isActive);
        });
    };

    const findTabByName = (tabName) => Array.from(commandTabs).find((tab) => tab.dataset.tabTarget === tabName);

    commandTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            setActiveTab(tab.dataset.tabTarget);
        });
        tab.addEventListener('keydown', (event) => {
            const tabsArr = Array.from(commandTabs);
            const index = tabsArr.indexOf(tab);
            if (index < 0) return;
            let targetIndex = null;
            if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabsArr.length;
            if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabsArr.length) % tabsArr.length;
            if (targetIndex === null) return;
            event.preventDefault();
            const targetTab = tabsArr[targetIndex];
            setActiveTab(targetTab.dataset.tabTarget);
            targetTab.focus();
        });
    });

    const initiallyActive = Array.from(commandTabs).find((tab) => tab.classList.contains('active')) || commandTabs[0];
    setActiveTab(initiallyActive.dataset.tabTarget);
    syncPanelsHeight();

    // Defensive sync when HTML was server-rendered without active tab class.
    const firstPanel = commandTabPanels[0];
    const firstTab = findTabByName(firstPanel?.dataset.tabPanel || '');
    if (!Array.from(commandTabs).some((tab) => tab.classList.contains('active')) && firstTab) {
        setActiveTab(firstTab.dataset.tabTarget);
    }

    window.addEventListener('resize', syncPanelsHeight);
}

export function setupWorkspaceTabs(workspaceTabs, workspacePanels, scheduleResize) {
    if (!workspaceTabs?.length || !workspacePanels?.length) return;
    const mobileMedia = window.matchMedia('(max-width: 1024px)');
    let activeTarget = (Array.from(workspaceTabs).find((tab) => tab.classList.contains('active')) || workspaceTabs[0]).dataset.workspaceTarget;

    const setActiveWorkspace = (target) => {
        if (!mobileMedia.matches) {
            workspaceTabs.forEach((tab, idx) => {
                const isActive = idx === 0;
                tab.classList.toggle('active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
                tab.setAttribute('tabindex', isActive ? '0' : '-1');
            });
            workspacePanels.forEach((panel) => {
                panel.classList.remove('active-panel', 'hidden');
                panel.setAttribute('aria-hidden', 'false');
            });
            return;
        }

        activeTarget = target;
        workspaceTabs.forEach((tab) => {
            const isActive = tab.dataset.workspaceTarget === target;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        workspacePanels.forEach((panel) => {
            const isActive = panel.dataset.workspacePanel === target;
            panel.classList.toggle('active-panel', isActive);
            panel.classList.toggle('hidden', !isActive);
            panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
        });

        if (target === 'canvas') {
            scheduleResize?.();
        }
    };

    workspaceTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            setActiveWorkspace(tab.dataset.workspaceTarget);
        });

        tab.addEventListener('keydown', (event) => {
            const tabsArr = Array.from(workspaceTabs);
            const index = tabsArr.indexOf(tab);
            if (index < 0) return;
            let targetIndex = null;
            if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabsArr.length;
            if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabsArr.length) % tabsArr.length;
            if (targetIndex === null) return;
            event.preventDefault();
            const targetTab = tabsArr[targetIndex];
            setActiveWorkspace(targetTab.dataset.workspaceTarget);
            targetTab.focus();
        });
    });

    setActiveWorkspace(activeTarget);
    mobileMedia.addEventListener('change', () => {
        setActiveWorkspace(activeTarget);
    });
}
