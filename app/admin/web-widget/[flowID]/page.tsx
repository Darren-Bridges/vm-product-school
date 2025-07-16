"use client";

import { AdminLayout } from '@/components/AdminLayout';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  useReactFlow,
  ReactFlowProvider,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { WebWidgetFlowForm } from '@/components/WebWidgetFlowForm';
import { Pencil } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogFooter as ConfirmDialogFooter, DialogClose as ConfirmDialogClose } from '@/components/ui/dialog';
import type { Edge as ReactFlowEdge } from 'reactflow';
import { useRouter } from 'next/navigation';


type FlowDB = {
  id: string;
  name: string;
  slug: string;
  flow_data: { nodes: Node[]; edges: Edge[] };
  is_default?: boolean;
  updated_at?: string;
};

type OptionEdge = ReactFlowEdge & {
  optionType?: 'static' | 'input';
  inputPlaceholder?: string;
};

export default function WebWidgetFlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}

function FlowEditorInner() {
  const params = useParams();
  const slug = params?.flowID as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [flow, setFlow] = useState<FlowDB | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<OptionEdge>([]);
  const [saving, setSaving] = useState(false);
  const [editNode, setEditNode] = useState<Node | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEdge, setEditEdge] = useState<Edge | null>(null);
  const [editEdgeLabel, setEditEdgeLabel] = useState('');
  const [availableFlows, setAvailableFlows] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [flowSelectorOpen, setFlowSelectorOpen] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [selectedFlowName, setSelectedFlowName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [articleSelectorOpen, setArticleSelectorOpen] = useState(false);
  const [availableArticles, setAvailableArticles] = useState<{ id: string; title: string }[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [selectedArticleTitle, setSelectedArticleTitle] = useState('');
  const [edgeCreationMode, setEdgeCreationMode] = useState<null | 'yes' | 'no'>(null);
  const [edgeSource, setEdgeSource] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState('Normal');
  const [editDetails, setEditDetails] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Node[]>([]);
  const [history, setHistory] = useState<{nodes: Node[]; edges: OptionEdge[]}[]>([]);
  const [future, setFuture] = useState<{nodes: Node[]; edges: OptionEdge[]}[]>([]);
  const [editEdgeOptionType, setEditEdgeOptionType] = useState<'static' | 'input'>('static');
  const [editEdgeInputPlaceholder, setEditEdgeInputPlaceholder] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    node: Node | null;
    x: number;
    y: number;
  } | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const router = useRouter();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [deleteFlowDialogOpen, setDeleteFlowDialogOpen] = useState(false);
  const [deleteFlowLoading, setDeleteFlowLoading] = useState(false);
  const [deleteFlowError, setDeleteFlowError] = useState<string | null>(null);

  // Helper to push current state to history
  const pushToHistory = useCallback(() => {
    setHistory(h => [...h, { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture(f => [{ nodes, edges }, ...f]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      return h.slice(0, -1);
    });
  }, [nodes, edges, setNodes, setEdges]);
  const handleRedo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory(h => [...h, { nodes, edges }]);
      setNodes(next.nodes);
      setEdges(next.edges);
      return f.slice(1);
    });
  }, [nodes, edges, setNodes, setEdges]);

  // Wrap onNodesChange/onEdgesChange to push to history
  const onNodesChangeWithHistory = useCallback((changes: NodeChange[]) => {
    pushToHistory();
    onNodesChange(changes);
  }, [onNodesChange, pushToHistory]);
  const onEdgesChangeWithHistory = useCallback((changes: EdgeChange[]) => {
    pushToHistory();
    onEdgesChange(changes);
  }, [onEdgesChange, pushToHistory]);

  // Also push to history for add node/edge actions
  const handleConnectWithHistory = useCallback((params: Edge | Connection) => {
    pushToHistory();
    setEdges((eds: OptionEdge[]) => addEdge(params, eds));
  }, [pushToHistory, setEdges]);

  // Fetch available flows for flow nodes
  useEffect(() => {
    const fetchAvailableFlows = async () => {
      try {
        const { data, error } = await supabase
          .from('web_widget_flows')
          .select('id, name, slug')
          .neq('slug', slug) // Exclude current flow
          .order('name');
        if (!error && data) {
          setAvailableFlows(data);
        }
      } catch (err) {
        console.error('Error fetching flows:', err);
      }
    };
    fetchAvailableFlows();
  }, [slug]);

  // Fetch articles for the selector
  useEffect(() => {
    if (!articleSelectorOpen) return;
    const fetchArticles = async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title')
        .order('title');
      if (!error && data) {
        setAvailableArticles(data);
      }
    };
    fetchArticles();
  }, [articleSelectorOpen]);

  // Handle flow selection and add flow node
  const handleFlowSelection = () => {
    if (!selectedFlowId || !selectedFlowName) return;
    
    const id = uuidv4();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'flow',
        data: { 
          label: `${selectedFlowName} (${availableFlows.find(f => f.id === selectedFlowId)?.slug || ''})`,
          flowId: selectedFlowId,
          flowSlug: availableFlows.find(f => f.id === selectedFlowId)?.slug || ''
        },
        position: {
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 200,
        },
        style: {
          background: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '8px',
          padding: '10px',
          minWidth: '150px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
      },
    ]);
    
    setFlowSelectorOpen(false);
    setSelectedFlowId('');
    setSelectedFlowName('');
  };

  // Handle article selection and add article node
  const handleArticleSelection = () => {
    if (!selectedArticleId || !selectedArticleTitle) return;
    if (editNode && editNode.type === 'article') {
      // Update the existing article node
      setNodes((nds) => nds.map(n =>
        n.id === editNode.id
          ? {
              ...n,
              data: {
                ...n.data,
                label: selectedArticleTitle,
                articleId: selectedArticleId,
                articleTitle: selectedArticleTitle,
              },
            }
          : n
      ));
      setEditNode(null);
    } else {
      // Add a new article node
    const id = uuidv4();
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'article',
        data: {
          label: selectedArticleTitle,
          articleId: selectedArticleId,
          articleTitle: selectedArticleTitle,
        },
        position: {
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 200,
        },
        style: {
          background: '#dbeafe', // blue-100
          border: '2px solid #3b82f6', // blue-500
          borderRadius: '8px',
          padding: '10px',
          minWidth: '150px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
      },
    ]);
    }
    setArticleSelectorOpen(false);
    setSelectedArticleId('');
    setSelectedArticleTitle('');
  };

  // Open modal on node double click
  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === 'article') {
      setEditNode(node);
      setSelectedArticleId(node.data?.articleId || '');
      setSelectedArticleTitle(node.data?.articleTitle || node.data?.label || '');
      setArticleSelectorOpen(true);
    } else {
    setEditNode(node);
    setEditLabel(node.data?.label || '');
      if (node.type === 'ticket') {
        setEditPriority(node.data?.priority || 'Normal');
      }
    }
  }, []);

  // Open modal on edge double click
  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEditEdge(edge);
    setEditEdgeLabel(typeof edge.label === 'string' ? edge.label : '');
    setEditEdgeOptionType((edge as OptionEdge)?.optionType || 'static');
    setEditEdgeInputPlaceholder((edge as OptionEdge)?.inputPlaceholder || '');
  }, []);

  // Save node changes
  const handleSaveNode = () => {
    if (!editNode) return;
    setNodes(nds => nds.map(n => {
      if (n.id !== editNode.id) return n;
      if (editNode.type === 'ticket') {
        return { ...n, data: { ...n.data, label: editLabel, priority: editPriority } };
      }
      return { ...n, data: { ...n.data, label: editLabel } };
    }));
    setEditNode(null);
  };

  // Save edge changes
  const handleSaveEdge = () => {
    if (!editEdge) return;
    setEdges(eds => eds.map(e => e.id === editEdge.id ? { ...e, label: editEdgeOptionType === 'static' ? editEdgeLabel : '', optionType: editEdgeOptionType, inputPlaceholder: editEdgeOptionType === 'input' ? editEdgeInputPlaceholder : '' } : e));
    setEditEdge(null);
  };

  // Fetch flow from Supabase
  useEffect(() => {
    if (!slug) return;
    const fetchFlow = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('web_widget_flows')
          .select('*')
          .eq('slug', slug)
          .single();
        if (error || !data) {
          setNotFound(true);
        } else {
          setFlow(data);
          setNodes(data.flow_data.nodes || []);
          setEdges(data.flow_data.edges || []);
          setIsDefault(data.is_default || false);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFlow();
    // eslint-disable-next-line
  }, [slug]);

  const getNodeStyleByType = (type: string): React.CSSProperties => {
    if (type === 'question') {
      return {
        background: '#fef9c3', // yellow-100
        border: '2px solid #eab308', // yellow-500
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (type === 'article') {
      return {
        background: '#dbeafe', // blue-100
        border: '2px solid #3b82f6', // blue-500
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (type === 'ticket') {
      return {
        background: '#fca5a5', // red-200
        border: '2px solid #ef4444', // red-500
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (type === 'flow') {
      return {
        background: '#f0f9ff', // light blue
        border: '2px solid #0ea5e9', // blue-400
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    return {};
  };

  // Save flow to Supabase
  const handleSave = async () => {
    if (!flow) return;
    setSaving(true);
    // Ensure all nodes have the correct style for their type
    const styledNodes = nodes.map(n => ({
      ...n,
      style: getNodeStyleByType(n.type || (n.data && n.data.type) || 'question'),
    }));
    await supabase
      .from('web_widget_flows')
      .update({
        flow_data: { nodes: styledNodes, edges },
        updated_at: new Date().toISOString(),
      })
      .eq('id', flow.id);
    setSaving(false);
  };

  // Set this flow as default
  const handleSetAsDefault = async () => {
    if (!flow) return;
    setSettingDefault(true);
    try {
      // First, unset any existing default flow
      await supabase
        .from('web_widget_flows')
        .update({ is_default: false })
        .eq('is_default', true);
      
      // Then set this flow as default
      await supabase
        .from('web_widget_flows')
        .update({ is_default: true })
        .eq('id', flow.id);
      
      setIsDefault(true);
    } catch (error) {
      console.error('Error setting default flow:', error);
    } finally {
      setSettingDefault(false);
    }
  };

  // Node click handler for edge creation mode
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (edgeCreationMode) {
      if (!edgeSource) {
        setEdgeSource(node.id);
      } else if (edgeSource !== node.id) {
        // Create edge
        setEdges(eds => [
          ...eds,
          {
            id: `${edgeSource}-${node.id}-${edgeCreationMode}`,
            source: edgeSource,
            target: node.id,
            optionType: 'static',
            label: edgeCreationMode === 'yes' ? 'Yes' : 'No',
            inputPlaceholder: '',
          },
        ]);
        setEdgeCreationMode(null);
        setEdgeSource(null);
      }
    }
  }, [edgeCreationMode, edgeSource, setEdges]);

  // Drag and drop handlers
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    if (nodeType === 'article') {
      setArticleSelectorOpen(true);
      // Optionally, store position for use after selection
      return;
    }
    if (nodeType === 'flow') {
      setFlowSelectorOpen(true);
      // Optionally, store position for use after selection
      return;
    }
    // For question/ticket, add node directly
    const id = uuidv4();
    let label = '';
    let style: React.CSSProperties = {};
    if (nodeType === 'question') {
      label = 'New Question';
      style = {
        background: '#fef9c3',
        border: '2px solid #eab308',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (nodeType === 'ticket') {
      label = 'Support Form';
      style = {
        background: '#fca5a5',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: nodeType,
        data: { label },
        position,
        style,
      },
    ]);
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      if (ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ctrlKey &&
        ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Context menu handler
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ node, x: event.clientX, y: event.clientY });
  }, []);

  // Close context menu on pane click or window click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Duplicate node
  const handleDuplicateNode = () => {
    if (!contextMenu?.node) return;
    const node = contextMenu.node;
    const id = uuidv4();
    setNodes(nds => [
      ...nds,
      {
        ...node,
        id,
        position: {
          x: (node.position?.x || 0) + 40,
          y: (node.position?.y || 0) + 40,
        },
        selected: false,
        dragging: false,
      },
    ]);
    setContextMenu(null);
  };

  // Delete node (with confirmation)
  const handleDeleteNode = () => {
    if (!nodeToDelete) return;
    setNodes(nds => nds.filter(n => n.id !== nodeToDelete.id));
    setEdges(eds => eds.filter(e => e.source !== nodeToDelete.id && e.target !== nodeToDelete.id));
    setDeleteConfirmOpen(false);
    setNodeToDelete(null);
    setContextMenu(null);
  };

  // Edit node (open modal)
  const handleEditNode = () => {
    if (!contextMenu?.node) return;
    setEditNode(contextMenu.node);
    if (contextMenu.node.type === 'article') {
      setSelectedArticleId(contextMenu.node.data?.articleId || '');
      setSelectedArticleTitle(contextMenu.node.data?.articleTitle || contextMenu.node.data?.label || '');
      setArticleSelectorOpen(true);
    } else {
      setEditLabel(contextMenu.node.data?.label || '');
      if (contextMenu.node.type === 'ticket') {
        setEditPriority(contextMenu.node.data?.priority || 'Normal');
      }
    }
    setContextMenu(null);
  };

  // Duplicate flow handler
  const handleDuplicateFlow = async ({ name, slug }: { name: string; slug: string }) => {
    if (!flow) return;
    setDuplicateLoading(true);
    setDuplicateError(null);
    // Check for unique slug
    const { data: existing, error: fetchError } = await supabase
      .from('web_widget_flows')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (fetchError) {
      setDuplicateError(fetchError.message);
      setDuplicateLoading(false);
      return;
    }
    if (existing) {
      setDuplicateError('A flow with this slug already exists.');
      setDuplicateLoading(false);
      return;
    }
    // Insert new flow with copied data
    const { data: newFlow, error: insertError } = await supabase
      .from('web_widget_flows')
      .insert([
        { name, slug, flow_data: flow.flow_data }
      ])
      .select()
      .single();
    if (insertError) {
      setDuplicateError(insertError.message);
      setDuplicateLoading(false);
      return;
    }
    setDuplicateLoading(false);
    setDuplicateDialogOpen(false);
    router.push(`/admin/web-widget/${newFlow.slug}`);
  };

  // Delete flow handler
  const handleDeleteFlow = async () => {
    if (!flow) return;
    setDeleteFlowLoading(true);
    setDeleteFlowError(null);
    const { error } = await supabase
      .from('web_widget_flows')
      .delete()
      .eq('id', flow.id);
    if (error) {
      setDeleteFlowError(error.message);
      setDeleteFlowLoading(false);
      return;
    }
    setDeleteFlowLoading(false);
    setDeleteFlowDialogOpen(false);
    router.push('/admin/web-widget');
  };

  if (loading) {
    return <div className="p-8">Loading…</div>;
  }
  if (notFound) {
    return <div className="p-8 text-red-600">Flow not found.</div>;
  }

  return (
    <AdminLayout sidebarOpen={false} setSidebarOpen={() => {}}>
      <div className="p-8">
        {isDefault && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Default Flow
              </span>
              <span className="text-sm text-green-800">
                This is the default flow that will be shown in the web widget
              </span>
            </div>
          </div>
        )}
        {flow && (
          <div className="mb-6 w-full">
            {!editDetails ? (
              <div className="flex items-start justify-between mb-2 w-full">
                <div className="flex items-center gap-3 min-w-0 flex-shrink">
                  <h1 className="text-3xl font-bold truncate max-w-xs md:max-w-md lg:max-w-xl">{flow.name}</h1>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground p-1"
                    aria-label="Edit flow details"
                    onClick={() => setEditDetails(true)}
                  >
                    <Pencil size={20} />
                  </button>
                  <span className="text-muted-foreground truncate">Slug: <span className="font-mono">{flow.slug}</span></span>
                </div>
                <div className="flex gap-2 items-center flex-shrink-0 ml-auto">
                  <Button onClick={handleSave} disabled={saving} className="px-6 py-2">
                    {saving ? 'Saving…' : 'Save Flow'}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="px-2 py-2"><MoreHorizontal className="w-5 h-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleSetAsDefault} disabled={isDefault || settingDefault}>
                        {settingDefault ? 'Setting as Default...' : 'Set as Default'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDuplicateDialogOpen(true)}>
                        Duplicate Flow
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteFlowDialogOpen(true)} disabled={isDefault} className="text-red-600 focus:text-red-600">
                        Delete Flow
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <WebWidgetFlowForm
                initialName={flow.name}
                initialSlug={flow.slug}
                loading={saving}
                error={null}
                submitLabel="Save Details"
                onSubmit={async ({ name, slug }) => {
                  setSaving(true);
                  await supabase
                    .from('web_widget_flows')
                    .update({ name, slug })
                    .eq('id', flow.id);
                  setFlow(f => f ? { ...f, name, slug } : f);
                  setSaving(false);
                  setEditDetails(false);
                }}
              />
            )}
          </div>
        )}
        {/* Undo/Redo Buttons */}
        <div className="flex gap-2 mb-2">
          <Button variant="outline" onClick={handleUndo} disabled={history.length === 0}>Undo</Button>
          <Button variant="outline" onClick={handleRedo} disabled={future.length === 0}>Redo</Button>
        </div>
        {/* End Undo/Redo Buttons */}
        {/* Node Palette and Edge Buttons */}
        <div className="flex gap-4 mb-4 items-center">
          <div
            className="cursor-move px-3 py-2 bg-yellow-100 border border-yellow-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'question')}
            title="Drag to add a Question node"
          >
            Question
          </div>
          <div
            className="cursor-move px-3 py-2 bg-blue-100 border border-blue-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'article')}
            title="Drag to add an Article node"
          >
            Article
          </div>
          <div
            className="cursor-move px-3 py-2 bg-red-100 border border-red-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'ticket')}
            title="Drag to add a Ticket node"
          >
            Ticket
          </div>
          <div
            className="cursor-move px-3 py-2 bg-sky-100 border border-sky-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'flow')}
            title="Drag to add a Flow node"
          >
            Flow
          </div>
          {selectedNodes.length === 1 && selectedNodes[0].type === 'article' && (
            <>
              <Button variant="secondary" onClick={() => { setEdgeCreationMode('yes'); setEdgeSource(null); }}>Add Yes Edge</Button>
              <Button variant="secondary" onClick={() => { setEdgeCreationMode('no'); setEdgeSource(null); }}>Add No Edge</Button>
            </>
          )}
        </div>
        {/* End Node Palette and Edge Buttons */}
        {edgeCreationMode && (
          <div className="mb-2 text-blue-700 font-medium">
            {edgeSource
              ? `Select the target node for the '${edgeCreationMode === 'yes' ? 'Yes' : 'No'}' edge.`
              : `Select the source node for the '${edgeCreationMode === 'yes' ? 'Yes' : 'No'}' edge.`}
          </div>
        )}
        {/* Node Palette */}
        {/* <div className="flex gap-4 mb-4">
          <div
            className="cursor-move px-3 py-2 bg-yellow-100 border border-yellow-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'question')}
            title="Drag to add a Question node"
          >
            Question
          </div>
          <div
            className="cursor-move px-3 py-2 bg-blue-100 border border-blue-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'article')}
            title="Drag to add an Article node"
          >
            Article
          </div>
          <div
            className="cursor-move px-3 py-2 bg-red-100 border border-red-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'ticket')}
            title="Drag to add a Ticket node"
          >
            Ticket
          </div>
          <div
            className="cursor-move px-3 py-2 bg-sky-100 border border-sky-400 rounded shadow"
            draggable
            onDragStart={e => onDragStart(e, 'flow')}
            title="Drag to add a Flow node"
          >
            Flow
          </div>
        </div> */}
        {/* End Node Palette */}
        <div
          ref={reactFlowWrapper}
          style={{ width: '100%', height: 600, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges.map(e => {
              const oe = e as OptionEdge;
              return {
                ...e,
                label: oe.optionType === 'input' ? `Input: ${oe.inputPlaceholder || ''}` : e.label
              };
            })}
            onNodesChange={onNodesChangeWithHistory}
            onEdgesChange={onEdgesChangeWithHistory}
            onConnect={handleConnectWithHistory}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onNodeClick={handleNodeClick}
            fitView={true}
            onSelectionChange={({ nodes }) => setSelectedNodes(nodes)}
            onNodeContextMenu={onNodeContextMenu}
          >
            <MiniMap />
            <Controls />
            <Background gap={16} />
          </ReactFlow>
          <Dialog open={!!editNode && editNode.type !== 'article'} onOpenChange={open => !open && setEditNode(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Node</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <label className="block text-sm font-medium mb-1">Label</label>
                <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
                {editNode?.type === 'ticket' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      className="w-full px-3 py-2 border rounded"
                      value={editPriority}
                      onChange={e => setEditPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveNode}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={!!editEdge} onOpenChange={open => !open && setEditEdge(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Edge</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <label className="block text-sm font-medium mb-1">Option Type</label>
                <select value={editEdgeOptionType} onChange={e => setEditEdgeOptionType(e.target.value as 'static' | 'input')}>
                  <option value="static">Static Option</option>
                  <option value="input">Input Field</option>
                </select>
                {editEdgeOptionType === 'static' ? (
                  <Input value={editEdgeLabel} onChange={e => setEditEdgeLabel(e.target.value)} />
                ) : (
                  <Input value={editEdgeInputPlaceholder} onChange={e => setEditEdgeInputPlaceholder(e.target.value)} placeholder="Input placeholder" />
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleSaveEdge}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Flow Selector Dialog */}
          <Dialog open={flowSelectorOpen} onOpenChange={open => !open && setFlowSelectorOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Flow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <label className="block text-sm font-medium mb-1">Choose a flow to reference</label>
                <select 
                  value={selectedFlowId}
                  onChange={(e) => {
                    const flow = availableFlows.find(f => f.id === e.target.value);
                    setSelectedFlowId(e.target.value);
                    setSelectedFlowName(flow?.name || '');
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select a flow...</option>
                  {availableFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="button" 
                  onClick={handleFlowSelection}
                  disabled={!selectedFlowId}
                >
                  Add Flow Node
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Article Selector Dialog */}
          <Dialog open={articleSelectorOpen} onOpenChange={open => !open && setArticleSelectorOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Article</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <label className="block text-sm font-medium mb-1">Choose an article to reference</label>
                <select
                  value={selectedArticleId}
                  onChange={e => {
                    const article = availableArticles.find(a => a.id === e.target.value);
                    setSelectedArticleId(e.target.value);
                    setSelectedArticleTitle(article?.title || '');
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select an article...</option>
                  {availableArticles.map(article => (
                    <option key={article.id} value={article.id}>{article.title}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleArticleSelection}
                  disabled={!selectedArticleId}
                >
                  Add Article Node
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {/* Custom Context Menu */}
        {contextMenu && contextMenu.node && (
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1000,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 160,
              padding: 8,
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="block w-full text-left px-3 py-2 hover:bg-accent rounded"
              onClick={handleEditNode}
            >
              Edit node
            </button>
            <button
              className="block w-full text-left px-3 py-2 hover:bg-accent rounded"
              onClick={handleDuplicateNode}
            >
              Duplicate
            </button>
            <button
              className="block w-full text-left px-3 py-2 hover:bg-red-100 text-red-700 rounded"
              onClick={() => {
                setNodeToDelete(contextMenu.node);
                setDeleteConfirmOpen(true);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        )}
        {/* End Custom Context Menu */}
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <ConfirmDialogContent>
            <ConfirmDialogHeader>
              <ConfirmDialogTitle>Delete node?</ConfirmDialogTitle>
            </ConfirmDialogHeader>
            <div>Are you sure you want to delete this node? This cannot be undone.</div>
            <ConfirmDialogFooter>
              <ConfirmDialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </ConfirmDialogClose>
              <Button type="button" variant="destructive" onClick={handleDeleteNode}>Delete</Button>
            </ConfirmDialogFooter>
          </ConfirmDialogContent>
        </ConfirmDialog>
        {/* End Delete Confirmation Dialog */}
        {/* Duplicate Flow Dialog */}
        <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicate Flow</DialogTitle>
            </DialogHeader>
            <WebWidgetFlowForm
              initialName={flow?.name ? `${flow.name} Copy` : ''}
              initialSlug={flow?.slug ? `${flow.slug}-copy` : ''}
              loading={duplicateLoading}
              error={duplicateError}
              submitLabel="Duplicate"
              onSubmit={handleDuplicateFlow}
            />
          </DialogContent>
        </Dialog>
        {/* Delete Flow Dialog */}
        <Dialog open={deleteFlowDialogOpen} onOpenChange={setDeleteFlowDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Flow</DialogTitle>
            </DialogHeader>
            <div className="mb-4">Are you sure you want to delete this flow? This cannot be undone.</div>
            {deleteFlowError && <div className="text-red-600 text-sm mb-2">{deleteFlowError}</div>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={deleteFlowLoading}>Cancel</Button>
              </DialogClose>
              <Button type="button" variant="destructive" onClick={handleDeleteFlow} disabled={deleteFlowLoading}>
                {deleteFlowLoading ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
} 