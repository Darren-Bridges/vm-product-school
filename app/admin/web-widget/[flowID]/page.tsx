"use client";

import { AdminLayout } from '@/components/AdminLayout';
import React, { useEffect, useState, useCallback } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';


type FlowDB = {
  id: string;
  name: string;
  slug: string;
  flow_data: { nodes: Node[]; edges: Edge[] };
  is_default?: boolean;
  updated_at?: string;
};

export default function WebWidgetFlowEditorPage() {
  const params = useParams();
  const slug = params?.flowID as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [flow, setFlow] = useState<FlowDB | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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

  const handleConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

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

  // Add node handlers
  const handleAddNode = (type: 'question' | 'article' | 'ticket' | 'flow') => {
    const id = uuidv4();
    let label = '';
    let style: React.CSSProperties = {};
    if (type === 'question') {
      label = 'New Question';
      style = {
        background: '#fef9c3', // yellow-100
        border: '2px solid #eab308', // yellow-500
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (type === 'article') {
      setArticleSelectorOpen(true);
      return; // Don't add node yet, wait for article selection
    }
    if (type === 'ticket') {
      label = 'Support Form';
      style = {
        background: '#fca5a5', // red-200
        border: '2px solid #ef4444', // red-500
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      };
    }
    if (type === 'flow') {
      setFlowSelectorOpen(true);
      return; // Don't add node yet, wait for flow selection
    }
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        data: { label },
        position: {
          x: 100 + Math.random() * 400,
          y: 100 + Math.random() * 200,
        },
        style,
      },
    ]);
  };

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
    setEdges(eds => eds.map(e => e.id === editEdge.id ? { ...e, label: editEdgeLabel } : e));
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
            label: edgeCreationMode === 'yes' ? 'Yes' : 'No',
          },
        ]);
        setEdgeCreationMode(null);
        setEdgeSource(null);
      }
    }
  }, [edgeCreationMode, edgeSource, setEdges]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit Flow: {flow?.name}</h1>
            <p className="text-muted-foreground">Slug: {flow?.slug}</p>
          </div>
          <div className="flex gap-2">
            {!isDefault && (
              <Button 
                onClick={handleSetAsDefault} 
                disabled={settingDefault} 
                variant="outline"
                className="px-4 py-2"
              >
                {settingDefault ? 'Setting...' : 'Set as Default'}
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="px-6 py-2">
              {saving ? 'Saving…' : 'Save Flow'}
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={() => handleAddNode('question')}>Add Question</Button>
          <Button variant="outline" onClick={() => handleAddNode('article')}>Add Article</Button>
          <Button variant="outline" onClick={() => handleAddNode('ticket')}>Add ticket form</Button>
          <Button variant="outline" onClick={() => handleAddNode('flow')}>Add Flow</Button>
          <Button variant="secondary" onClick={() => { setEdgeCreationMode('yes'); setEdgeSource(null); }}>Add Yes Edge</Button>
          <Button variant="secondary" onClick={() => { setEdgeCreationMode('no'); setEdgeSource(null); }}>Add No Edge</Button>
        </div>
        {edgeCreationMode && (
          <div className="mb-2 text-blue-700 font-medium">
            {edgeSource
              ? `Select the target node for the '${edgeCreationMode === 'yes' ? 'Yes' : 'No'}' edge.`
              : `Select the source node for the '${edgeCreationMode === 'yes' ? 'Yes' : 'No'}' edge.`}
          </div>
        )}
        <div style={{ width: '100%', height: 600, background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onNodeClick={handleNodeClick}
            fitView
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
                <label className="block text-sm font-medium mb-1">Label</label>
                <Input value={editEdgeLabel} onChange={e => setEditEdgeLabel(e.target.value)} />
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
      </div>
    </AdminLayout>
  );
} 