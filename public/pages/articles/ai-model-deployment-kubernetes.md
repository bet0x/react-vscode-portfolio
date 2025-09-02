---
title: "Deploying AI Models on Kubernetes: A Production Guide"
date: "2024-01-20"
tags: ["kubernetes", "ai", "machine-learning", "deployment", "nvidia", "triton"]
summary: "Learn how to deploy and scale AI models in production using Kubernetes, NVIDIA Triton, and modern MLOps practices."
author: "Alberto Ferrer"
slug: "ai-model-deployment-kubernetes"
---

# Deploying AI Models on Kubernetes: A Production Guide

As an AI Architect at Rackspace Technology, I've learned that deploying AI models in production requires more than just getting the model to work—it requires scalability, reliability, and efficient resource utilization. This guide covers my approach to deploying AI models on Kubernetes using NVIDIA Triton and modern MLOps practices.

## Prerequisites

Before diving into deployment, ensure you have:

- Kubernetes cluster with GPU nodes
- NVIDIA GPU Operator installed
- Basic understanding of Kubernetes concepts
- Familiarity with containerization

## Architecture Overview

Our deployment architecture consists of:

1. **Model Store**: S3-compatible storage for model artifacts
2. **Triton Inference Server**: High-performance model serving
3. **API Gateway**: Load balancing and request routing
4. **Monitoring Stack**: Prometheus + Grafana for observability

## Setting Up NVIDIA Triton Server

### 1. Model Repository Structure

Organize your models following Triton's repository structure:

```
model_repository/
├── text_classification/
│   ├── config.pbtxt
│   └── 1/
│       └── model.onnx
├── image_classification/
│   ├── config.pbtxt
│   └── 1/
│       └── model.pt
└── llama2_chat/
    ├── config.pbtxt
    └── 1/
        ├── model/
        └── tokenizer/
```

### 2. Model Configuration

Example `config.pbtxt` for a PyTorch model:

```protobuf
name: "image_classification"
platform: "pytorch_libtorch"
max_batch_size: 8
input [
  {
    name: "INPUT__0"
    data_type: TYPE_FP32
    dims: [ 3, 224, 224 ]
  }
]
output [
  {
    name: "OUTPUT__0"
    data_type: TYPE_FP32
    dims: [ 1000 ]
  }
]
instance_group [
  {
    count: 1
    kind: KIND_GPU
    gpus: [ 0 ]
  }
]
dynamic_batching {
  max_queue_delay_microseconds: 100
}
```

## Kubernetes Deployment Manifests

### 1. Triton Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: triton-inference-server
  namespace: ml-inference
spec:
  replicas: 2
  selector:
    matchLabels:
      app: triton-inference-server
  template:
    metadata:
      labels:
        app: triton-inference-server
    spec:
      containers:
      - name: triton-inference-server
        image: nvcr.io/nvidia/tritonserver:24.01-py3
        ports:
        - containerPort: 8000
          name: http
        - containerPort: 8001
          name: grpc
        - containerPort: 8002
          name: metrics
        command:
        - tritonserver
        args:
        - --model-repository=s3://your-bucket/models
        - --allow-http=true
        - --allow-grpc=true
        - --allow-metrics=true
        - --log-verbose=1
        env:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: s3-credentials
              key: secret-access-key
        resources:
          requests:
            nvidia.com/gpu: 1
            memory: "4Gi"
            cpu: "2"
          limits:
            nvidia.com/gpu: 1
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /v2/health/live
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /v2/health/ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: triton-inference-service
  namespace: ml-inference
spec:
  selector:
    app: triton-inference-server
  ports:
  - name: http
    port: 8000
    targetPort: 8000
  - name: grpc
    port: 8001
    targetPort: 8001
  - name: metrics
    port: 8002
    targetPort: 8002
  type: ClusterIP
```

### 2. Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: triton-hpa
  namespace: ml-inference
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: triton-inference-server
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## API Gateway with Istio

### 1. Virtual Service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: triton-vs
  namespace: ml-inference
spec:
  http:
  - match:
    - uri:
        prefix: /v2/models
    route:
    - destination:
        host: triton-inference-service
        port:
          number: 8000
    timeout: 300s
    retries:
      attempts: 3
      perTryTimeout: 100s
```

### 2. Destination Rule

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: triton-dr
  namespace: ml-inference
spec:
  host: triton-inference-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: "model-name"
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
```

## Monitoring and Observability

### 1. ServiceMonitor for Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: triton-metrics
  namespace: ml-inference
spec:
  selector:
    matchLabels:
      app: triton-inference-server
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### 2. Grafana Dashboard Configuration

Key metrics to monitor:

- **Request Rate**: `rate(nv_inference_request_success_total[5m])`
- **Request Duration**: `histogram_quantile(0.95, nv_inference_request_duration_us_bucket)`
- **GPU Utilization**: `nv_gpu_utilization`
- **GPU Memory**: `nv_gpu_memory_used_bytes / nv_gpu_memory_total_bytes`

## Model Versioning and A/B Testing

### 1. Canary Deployment

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: triton-rollout
  namespace: ml-inference
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 10m}
      - setWeight: 40
      - pause: {duration: 10m}
      - setWeight: 60
      - pause: {duration: 10m}
      - setWeight: 80
      - pause: {duration: 10m}
  selector:
    matchLabels:
      app: triton-inference-server
  template:
    metadata:
      labels:
        app: triton-inference-server
    spec:
      containers:
      - name: triton-inference-server
        image: nvcr.io/nvidia/tritonserver:24.01-py3
        # ... rest of container spec
```

## Performance Optimization

### 1. Model Optimization Techniques

```python
# Example: Converting PyTorch to TensorRT
import torch
import torch_tensorrt

# Load your model
model = torch.load('model.pth')
model.eval()

# Example input
example_input = torch.randn(1, 3, 224, 224).cuda()

# Convert to TensorRT
trt_model = torch_tensorrt.compile(
    model,
    inputs=[example_input],
    enabled_precisions={torch.float, torch.half},
    workspace_size=1 << 22
)

# Save the optimized model
torch.jit.save(trt_model, "model_trt.ts")
```

### 2. Dynamic Batching Configuration

```protobuf
dynamic_batching {
  preferred_batch_size: [ 4, 8 ]
  max_queue_delay_microseconds: 100
  preserve_ordering: false
  priority_levels: 2
  default_priority_level: 1
  default_queue_policy {
    timeout_action: REJECT
    default_timeout_microseconds: 1000000
    allow_timeout_override: true
    max_queue_size: 4
  }
}
```

## Security Best Practices

### 1. Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: triton-network-policy
  namespace: ml-inference
spec:
  podSelector:
    matchLabels:
      app: triton-inference-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: api-gateway
    ports:
    - protocol: TCP
      port: 8000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS for S3
```

### 2. Pod Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
```

## Troubleshooting Common Issues

### 1. GPU Resource Issues

```bash
# Check GPU availability
kubectl describe nodes | grep nvidia.com/gpu

# Check GPU allocation
kubectl get pods -o wide | grep triton
kubectl describe pod <pod-name>
```

### 2. Model Loading Problems

```bash
# Check Triton logs
kubectl logs deployment/triton-inference-server -n ml-inference

# Verify model repository access
kubectl exec -it deployment/triton-inference-server -n ml-inference -- \
  curl -s http://localhost:8000/v2/repository/index
```

### 3. Performance Issues

```bash
# Monitor resource usage
kubectl top pods -n ml-inference

# Check inference metrics
kubectl port-forward service/triton-inference-service 8002:8002 -n ml-inference
curl http://localhost:8002/metrics | grep nv_inference
```

## Conclusion

Deploying AI models on Kubernetes requires careful consideration of:

1. **Resource Management**: Proper GPU allocation and scaling
2. **Model Optimization**: Using TensorRT and dynamic batching
3. **Monitoring**: Comprehensive metrics and alerting
4. **Security**: Network policies and secure configurations
5. **High Availability**: Redundancy and graceful degradation

The key to success is starting simple and iteratively adding complexity as your requirements grow. Monitor everything, automate what you can, and always plan for scale.

## Next Steps

- Implement model drift detection
- Add automated model retraining pipelines
- Explore multi-model serving strategies
- Consider edge deployment scenarios

---

*This guide reflects practical experience deploying AI models at enterprise scale. For the latest updates and examples, visit my [GitHub repository](https://github.com/bet0x/k8s-ml-deployment-examples).*
